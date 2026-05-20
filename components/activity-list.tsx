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
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
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
        <p className="text-lg font-semibold text-foreground mb-1">暫無活動</p>
        <p className="text-sm text-muted-foreground text-center">
          此地區暫時沒有羽毛球活動
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 space-y-4">
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
