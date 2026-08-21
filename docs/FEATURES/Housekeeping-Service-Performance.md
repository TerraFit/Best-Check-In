# FastCheckIn — Housekeeping Service Performance & Quality

## Purpose

Create a structured housekeeping service workflow that combines task checklists, target service times, live timers, quality controls, and employee performance records without rewarding speed at the expense of room quality.

## Service types

- Refresh
- Full Service
- Deep Cleaning
- Mattress Flip & Air
- Guest Check-Out Inspection

## Stage A — Service execution engine

- Add service-session data separate from the existing task schedule.
- Record immutable start and completion timestamps.
- Store target duration as a snapshot on the session so later configuration changes do not alter historical performance.
- Support target durations by generic room type, including Standard, Junior Suite, Suite, Luxury Suite, Presidential Suite and Penthouse.
- Permit a hotel to configure additional room types without code changes.
- Keep service type as the primary target selector and room type as an optional override.
- Make the active timer recoverable after browser sleep, refresh or temporary network loss by calculating elapsed time from persisted timestamps rather than browser tick counts.
- Preserve the existing housekeeping scheduling engine and task lifecycle.

## Stage B — Housekeeper service modal

When a housekeeper presses Start, the task enters `in_progress` and the service modal opens.

The modal contains:

- Room number and room name
- Room type
- Service type
- Target duration
- Large live countdown timer
- Checklist grouped by sections
- Checklist progress
- Report issue / maintenance action
- Complete Service action

Timer behaviour:

- Green during normal service.
- Configurable warning threshold changes the timer to yellow and emits an optional beep and voice announcement.
- Five-second visual countdown immediately before target time.
- At target time, switch to over-target state and continue counting actual elapsed time.
- Optional voice announcement: `Target service time exceeded.`
- Voice can be muted without disabling visual warnings.
- Pause is not part of the initial implementation; if introduced later it must be explicitly configured by management and fully recorded.

## Stage C — Quality gate

Completion may trigger supervisor inspection according to hotel policy.

Record:

- Pass
- Pass with minor issue
- Fail / rework required
- Rework duration
- Final completion timestamp

Initial service time must remain preserved when rework occurs.

## Stage D — Management configuration

Management configures target durations and warning behaviour.

Generic room-type examples:

- Standard
- Junior Suite
- Suite
- Luxury Suite
- Presidential Suite
- Penthouse

Targets are configured per service type and may optionally be overridden by room type.

Historical service sessions always retain their original target snapshot.

## Stage E — Performance analytics

Employee performance must not be based on speed alone.

Recommended score dimensions:

- Quality
- Target-time adherence
- Reliability
- Operational reporting quality

Speed is treated as one performance input, not the sole objective.

## Stage F — Preventive housekeeping

Deep Cleaning and Mattress Flip & Air are scheduled services rather than ordinary daily stayover services.

Mattress maintenance supports configurable manufacturer-aligned intervals and records mattress condition and service history.

## Stage G — Guest Check-Out Inspection

Checkout inspection remains a distinct task before housekeeping service begins.

If guest property is found, the task should provide a direct Lost & Found workflow and retain room, booking, staff and timestamp context.

## Non-regression requirements

This feature must preserve:

- Existing room allocation and availability workflow
- Existing housekeeping scheduling policy logic
- Existing room statuses and readiness transitions
- Existing employee permissions / RBAC
- Existing Lost & Found integration
- Existing auditability
- Existing translations and language architecture

## Implementation order

1. Service execution data model and types
2. Start/session persistence and timer engine
3. Housekeeper modal and structured checklists
4. Quality gate and rework
5. Management configuration
6. Performance analytics and scoring
7. Preventive deep-clean and mattress scheduling
8. Checkout inspection integration
