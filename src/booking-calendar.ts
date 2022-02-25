import { addMinutes, differenceInMinutes, isWithinInterval } from "date-fns";

type Booking = Availability & {
  id: string;
};

type Availability = {
  starts: string;
  ends: string;
};

type CalendarPhotographer = Photographer & {
  availabilities: Availability[];
  bookings: Booking[];
};

type Calendar = {
  photographers: CalendarPhotographer[];
};

type AvailableSlot = {
  photographer: Photographer;
  timeSlot: Availability;
};

type TimeSlot = {
  photographerId: string;
  timeSlot: TimeSlotDuration[];
};

type TimeSlotDuration = {
  minutesAvailable: number;
  startDate: string;
  endDate: string;
};

type Photographer = {
  id: string;
  name: string;
};

const calendar: Calendar = {
  photographers: [
    {
      id: "1",
      name: "Otto Crawford",
      availabilities: [
        {
          starts: "2020-11-25T08:00:00.000Z",
          ends: "2020-11-25T16:00:00.000Z",
        },
      ],
      bookings: [
        {
          id: "1",
          starts: "2020-11-25T08:30:00.000Z",
          ends: "2020-11-25T09:30:00.000Z",
        },
      ],
    },
    {
      id: "2",
      name: "Jens Mills",
      availabilities: [
        {
          starts: "2020-11-25T08:00:00.000Z",
          ends: "2020-11-25T09:00:00.000Z",
        },
        {
          starts: "2020-11-25T13:00:00.000Z",
          ends: "2020-11-25T16:00:00.000Z",
        },
      ],
      bookings: [
        {
          id: "2",
          starts: "2020-11-25T15:00:00.000Z",
          ends: "2020-11-25T16:00:00.000Z",
        },
      ],
    },
  ],
};

function isInRange(start: Date, end: Date, date: Date): boolean {
  const inRange = isWithinInterval(date, { start, end });
  return inRange;
}

function availableSlotsInMinutes(
  availabilities: Availability[],
  bookings: Booking[],
  photographerId: string
): TimeSlot {
  const timeSlotsInMinutes = availabilities.flatMap((availability) =>
    bookings.reduce<TimeSlotDuration[]>((timeSlots, booking) => {
      const availabilityStartDate = new Date(availability.starts);
      const availabilityEndDate = new Date(availability.ends);
      const bookingStartDate = new Date(booking.starts);
      const bookingEndDate = new Date(booking.ends);

      const isStartDateWithinRange = isWithinInterval(bookingStartDate, {
        start: availabilityStartDate,
        end: availabilityEndDate,
      });
      const isEndDateWithinRange = isWithinInterval(bookingEndDate, {
        start: availabilityStartDate,
        end: availabilityEndDate,
      });

      if (!isStartDateWithinRange && !isEndDateWithinRange) {
        timeSlots.push({
          minutesAvailable: Math.abs(
            differenceInMinutes(
              new Date(availability.starts),
              new Date(availability.ends)
            )
          ),
          startDate: availability.starts,
          endDate: availability.ends,
        });
        return timeSlots;
      }

      timeSlots.push({
        minutesAvailable: Math.abs(
          differenceInMinutes(
            new Date(availability.starts),
            new Date(booking.starts)
          )
        ),
        startDate: availability.starts,
        endDate: booking.starts,
      });

      if (differenceInMinutes(bookingEndDate, availabilityEndDate)) {
        timeSlots.push({
          minutesAvailable: Math.abs(
            differenceInMinutes(bookingEndDate, availabilityEndDate)
          ),
          startDate: booking.ends,
          endDate: availability.ends,
        });
      }

      return timeSlots;
    }, [])
  );

  return {
    photographerId,
    timeSlot: timeSlotsInMinutes,
  };
}

function availableTimeSlotsForBooking(
  durationInMinutes: number
): AvailableSlot[] {
  if (typeof durationInMinutes !== "number") {
    throw new Error("Duration is expected to be a number");
  }

  const { photographers } = calendar;

  const availableTimeSlotsInMinutes = photographers.map((photographer) => {
    const { availabilities, bookings } = photographer;
    const timeSlots = availableSlotsInMinutes(
      availabilities,
      bookings,
      photographer.id
    );
    return timeSlots;
  });

  const selectPhotographerBasedOnAvailability = availableTimeSlotsInMinutes
    .map((availableTimeSlot) => {
      const timeSlot = availableTimeSlot.timeSlot.find(
        (timeSlot) => durationInMinutes <= timeSlot.minutesAvailable
      );

      if (!timeSlot) {
        return;
      }

      const photographer = photographers.find(
        (p) => p.id === availableTimeSlot.photographerId
      );

      if (!photographer) {
        return;
      }

      return {
        photographer: {
          id: photographer.id,
          name: photographer.name,
        },
        timeSlot: {
          starts: timeSlot.startDate,
          ends: addMinutes(
            new Date(timeSlot.startDate),
            durationInMinutes
          ).toUTCString(),
        },
      } as AvailableSlot;
    })
    .filter((availableSlot) => availableSlot);

  return selectPhotographerBasedOnAvailability as AvailableSlot[];
}

const availableSlots = availableTimeSlotsForBooking(
  Number.parseInt(process.env.npm_config_durationInMinutes || "90")
);
console.log("availableSlots", availableSlots);
