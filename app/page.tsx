"use client"

import { useState } from "react"
import { Plus, ChevronDown } from "lucide-react"
import { ActivityList } from "@/components/activity-list"
import { CreateActivitySheet } from "@/components/create-activity-sheet"
import { DistrictPicker } from "@/components/district-picker"
import type { Activity, District } from "@/types/activity"

const initialActivities: Activity[] = [
  {
    id: "1",
    district: "觀塘區",
    venue: "藍田體育館",
    dateTime: "2026年5月25日 (日) 19:00-21:00",
    shuttlecock: "RSL No.1",
    pricePerPerson: 45,
    totalSlots: 8,
    remainingSlots: 3,
    contactPhone: "9123 4567",
  },
  {
    id: "2",
    district: "沙田區",
    venue: "沙田體育館",
    dateTime: "2026年5月24日 (六) 14:00-16:00",
    shuttlecock: "RSL No.1",
    pricePerPerson: 40,
    totalSlots: 6,
    remainingSlots: 2,
    contactPhone: "9234 5678",
  },
  {
    id: "3",
    district: "灣仔區",
    venue: "灣仔體育館",
    dateTime: "2026年5月26日 (一) 20:00-22:00",
    shuttlecock: "RSL No.1",
    pricePerPerson: 50,
    totalSlots: 8,
    remainingSlots: 5,
    contactPhone: "9345 6789",
  },
  {
    id: "4",
    district: "將軍澳",
    venue: "將軍澳體育館",
    dateTime: "2026年5月27日 (二) 18:00-20:00",
    shuttlecock: "Victor Master Ace",
    pricePerPerson: 55,
    totalSlots: 10,
    remainingSlots: 7,
    contactPhone: "9456 7890",
  },
  {
    id: "5",
    district: "大埔區",
    venue: "大埔體育館",
    dateTime: "2026年5月28日 (三) 19:00-21:00",
    shuttlecock: "RSL No.1",
    pricePerPerson: 38,
    totalSlots: 6,
    remainingSlots: 1,
    contactPhone: "9567 8901",
  },
]

export default function Home() {
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [selectedDistrict, setSelectedDistrict] = useState<District>("全港")
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const filteredActivities =
    selectedDistrict === "全港"
      ? activities
      : activities.filter((activity) => activity.district === selectedDistrict)

  const handleRegister = (id: string) => {
    setActivities((prev) =>
      prev.map((activity) =>
        activity.id === id && activity.remainingSlots > 0
          ? { ...activity, remainingSlots: activity.remainingSlots - 1 }
          : activity
      )
    )
  }

  const handleCreateActivity = (newActivity: Omit<Activity, "id">) => {
    const activity: Activity = {
      ...newActivity,
      id: Date.now().toString(),
    }
    setActivities((prev) => [activity, ...prev])
    setIsSheetOpen(false)
  }

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground">
      {/* Hero Header */}
      <header className="px-6 pt-14 pb-8">
        <h1 className="text-4xl font-bold tracking-[0.05em] leading-[1.6] text-balance">
          +1
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed tracking-[0.03em] text-muted-foreground text-pretty">
          一齊打波，拒絕放飛機。尋找跟你一夾即合的純粹波友。
        </p>
      </header>

      {/* District Selector */}
      <div className="px-6 pb-6">
        <button
          onClick={() => setIsPickerOpen(true)}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-secondary active:bg-muted"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background">
              <svg
                className="h-4 w-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xs tracking-[0.12em] text-muted-foreground">目前地區</p>
              <p className="text-base font-medium tracking-[0.05em] text-foreground">
                {selectedDistrict}
              </p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Activities Count */}
      <div className="px-6 pb-4">
        <p className="text-sm tracking-[0.05em] text-muted-foreground">
          找到{" "}
          <span className="font-medium text-foreground">
            {filteredActivities.length}
          </span>{" "}
          個場次
        </p>
      </div>

      {/* Activity List */}
      <ActivityList activities={filteredActivities} onRegister={handleRegister} />

      {/* Floating Action Button */}
      <button
        onClick={() => setIsSheetOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-colors hover:bg-secondary active:bg-muted"
        aria-label="發佈場地"
      >
        <Plus className="h-6 w-6" strokeWidth={1.8} />
      </button>

      {/* District Picker */}
      <DistrictPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        selectedDistrict={selectedDistrict}
        onSelectDistrict={setSelectedDistrict}
      />

      {/* Create Activity Sheet */}
      <CreateActivitySheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onSubmit={handleCreateActivity}
      />
    </main>
  )
}
