"use client"

import type { Activity } from "@/types/activity"
import { ActivityCard } from "./activity-card"

interface ActivityListProps {
  activities: Activity[]
  onRegister: (id: string) => void
}

export function ActivityList({ activities, onRegister }: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <p className="mb-1 text-lg font-medium tracking-[0.05em] text-foreground">
          暫無場次
        </p>
        <p className="text-center text-sm tracking-[0.05em] text-muted-foreground">
          此地區暫時沒有羽毛球場次
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 px-5">
      {activities.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          onRegister={() => onRegister(activity.id)}
        />
      ))}
    </div>
  )
}
