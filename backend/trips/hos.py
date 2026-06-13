from dataclasses import dataclass, field
from typing import List, Dict

OFF = "OFF"
SB = "SB"
DRIVING = "D"
ON = "ON"

AVG_SPEED_MPH = 55.0
MAX_DRIVE_PER_WINDOW = 11.0
MAX_WINDOW = 14.0
DRIVE_BEFORE_BREAK = 8.0
BREAK_DURATION = 0.5
DAILY_RESET = 10.0
CYCLE_LIMIT = 70.0
RESTART_DURATION = 34.0
FUEL_INTERVAL_MILES = 1000.0
FUEL_DURATION = 0.5
PICKUP_DURATION = 1.0
DROPOFF_DURATION = 1.0
DAY_START_HOUR = 8.0

EPS = 1e-6


@dataclass
class Segment:
    status: str
    start: float
    end: float
    label: str = ""
    miles_at: float = 0.0
    is_stop: bool = False

    @property
    def duration(self) -> float:
        return self.end - self.start


@dataclass
class HOSResult:
    segments: List[Segment] = field(default_factory=list)
    total_drive_hours: float = 0.0
    total_on_duty_hours: float = 0.0
    total_duration_hours: float = 0.0
    total_miles: float = 0.0
    cycle_used_start: float = 0.0
    cycle_used_end: float = 0.0
    feasible: bool = True
    warnings: List[str] = field(default_factory=list)


class _Sim:
    def __init__(self, current_cycle_used: float):
        self.t = 0.0
        self.cycle_used = max(0.0, current_cycle_used)
        self.drive_in_window = 0.0
        self.window_start = DAY_START_HOUR
        self.since_break = 0.0
        self.cum_miles = 0.0
        self.next_fuel = FUEL_INTERVAL_MILES
        self.segments: List[Segment] = []
        self.warnings: List[str] = []
        self.total_drive = 0.0
        self.total_on_duty = 0.0

    def add(self, status, dur, label="", is_stop=False):
        if dur <= EPS:
            return
        seg = Segment(status, self.t, self.t + dur, label, self.cum_miles, is_stop)
        self.segments.append(seg)
        self.t += dur
        if status == DRIVING:
            self.total_drive += dur
        if status in (DRIVING, ON):
            self.total_on_duty += dur

    def take_reset(self, hours, status, label):
        self.add(status, hours, label, is_stop=True)
        self.window_start = self.t
        self.drive_in_window = 0.0
        self.since_break = 0.0

    def take_restart(self):
        self.add(OFF, RESTART_DURATION, "34-hour restart", is_stop=True)
        self.window_start = self.t
        self.drive_in_window = 0.0
        self.since_break = 0.0
        self.cycle_used = 0.0

    def take_break(self):
        self.add(OFF, BREAK_DURATION, "30-minute break", is_stop=True)
        self.since_break = 0.0


def simulate(legs: List[Dict], current_cycle_used: float) -> HOSResult:
    sim = _Sim(current_cycle_used)

    sim.add(OFF, DAY_START_HOUR, "Start of day (off duty)")

    total_remaining_drive_miles = sum(
        leg.get("miles", 0.0) for leg in legs if leg["type"] == "drive"
    )

    for leg in legs:
        if leg["type"] == "onduty":
            sim.add(ON, leg["hours"], leg.get("label", "On duty"), is_stop=True)
            sim.cycle_used += leg["hours"]
            continue

        miles_remaining = leg["miles"]
        hours_remaining = miles_remaining / AVG_SPEED_MPH
        leg_label = leg.get("label", "Driving")
        guard = 0

        while hours_remaining > EPS:
            guard += 1
            if guard > 100000:
                sim.warnings.append("Simulation guard tripped; output truncated.")
                break

            until_window = MAX_WINDOW - (sim.t - sim.window_start)
            until_daily = MAX_DRIVE_PER_WINDOW - sim.drive_in_window
            until_break = DRIVE_BEFORE_BREAK - sim.since_break
            until_cycle = CYCLE_LIMIT - sim.cycle_used

            if until_cycle <= EPS:
                sim.take_restart()
                continue
            if until_window <= EPS or until_daily <= EPS:
                sim.take_reset(DAILY_RESET, SB, "10-hour rest (reset)")
                continue
            if until_break <= EPS:
                sim.take_break()
                continue

            miles_to_fuel = max(0.0, sim.next_fuel - sim.cum_miles)
            hours_to_fuel = miles_to_fuel / AVG_SPEED_MPH if miles_to_fuel > 0 else 0.0

            options = [hours_remaining, until_window, until_daily,
                       until_break, until_cycle]
            if hours_to_fuel > EPS:
                options.append(hours_to_fuel)
            chunk = min(options)
            if chunk <= EPS:
                sim.take_reset(DAILY_RESET, SB, "10-hour rest (reset)")
                continue

            sim.add(DRIVING, chunk, leg_label)
            miles_driven = chunk * AVG_SPEED_MPH
            sim.cum_miles += miles_driven
            sim.drive_in_window += chunk
            sim.since_break += chunk
            sim.cycle_used += chunk
            hours_remaining -= chunk
            miles_remaining -= miles_driven
            total_remaining_drive_miles -= miles_driven

            if (sim.cum_miles >= sim.next_fuel - EPS
                    and total_remaining_drive_miles > EPS):
                sim.add(ON, FUEL_DURATION, "Fuel stop", is_stop=True)
                sim.cycle_used += FUEL_DURATION
                sim.next_fuel += FUEL_INTERVAL_MILES

    end_of_last_day = (int(sim.t // 24) + 1) * 24
    if end_of_last_day - sim.t > EPS:
        sim.add(OFF, end_of_last_day - sim.t, "End of trip (off duty)")

    return HOSResult(
        segments=sim.segments,
        total_drive_hours=sim.total_drive,
        total_on_duty_hours=sim.total_on_duty,
        total_duration_hours=sim.segments[-1].end if sim.segments else 0.0,
        total_miles=sim.cum_miles,
        cycle_used_start=max(0.0, current_cycle_used),
        cycle_used_end=sim.cycle_used,
        feasible=not any("guard" in w for w in sim.warnings),
        warnings=sim.warnings,
    )
