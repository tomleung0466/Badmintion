"use client"

import { useState } from "react"
import type { Activity } from "@/types/activity"
import { MapPin, Clock, Phone } from "lucide-react"

interface ActivityCardProps {
  activity: Activity
  onRegister: () => void
}

export function ActivityCard({ activity, onRegister }: ActivityCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isFull = activity.remainingSlots === 0
  const isAlmostFull = activity.remainingSlots <= 2 && activity.remainingSlots > 0

  const handleRegister = async () => {
    if (isFull || isLoading) return

    setIsLoading(true)
    // Simulate network delay for smooth animation
    await new Promise((resolve) => setTimeout(resolve, 600))
    onRegister()
    setIsLoading(false)
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-border/50">
      {/* Main Content */}
      <div className="p-5">
        {/* Top Row: District Tag & Slots */}
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald bg-emerald/10 px-2.5 py-1 rounded-full">
            <MapPin className="h-3 w-3" />
            {activity.district}
          </span>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              isFull
                ? "bg-destructive/10 text-destructive"
                : isAlmostFull
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-emerald/10 text-emerald"
            }`}
          >
            {isFull ? "已滿額" : `剩餘 ${activity.remainingSlots} 位`}
          </span>
        </div>

        {/* Venue Name */}
        <h3 className="text-xl font-bold text-foreground mb-4 tracking-tight">
          {activity.venue}
        </h3>

        {/* Details */}
        <div className="space-y-2.5 mb-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-emerald shrink-0" />
            <span>{activity.dateTime}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <svg
              className="h-4 w-4 text-emerald shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12M6 12h12" />
            </svg>
            <span>用球：{activity.shuttlecock}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 text-emerald shrink-0" />
            <span>{activity.contactPhone}</span>
          </div>
        </div>

        {/* Price & Register Row */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            <span className="text-2xl font-bold text-foreground">
              ${activity.pricePerPerson}
            </span>
            <span className="text-sm text-muted-foreground ml-1">/人</span>
          </div>
          <button
            onClick={handleRegister}
            disabled={isFull || isLoading}
            className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 min-w-[120px] ${
              isFull
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : isLoading
                  ? "bg-foreground text-background"
                  : "bg-foreground text-background hover:bg-foreground/90 active:scale-95"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                處理中
              </span>
            ) : isFull ? (
              "已滿額"
            ) : (
              "確認留位"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
