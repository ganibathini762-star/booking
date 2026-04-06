import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const CITIES = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Surat",
] as const;

export type City = (typeof CITIES)[number];

type CityState = {
  selectedCity: City;
  setCity: (city: City) => void;
  cities: readonly City[];
};

export const useCityStore = create<CityState>()(
  persist(
    (set) => ({
      selectedCity: "Mumbai",
      cities: CITIES,
      setCity: (city) => set({ selectedCity: city }),
    }),
    {
      name: "ticketflow-city",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
