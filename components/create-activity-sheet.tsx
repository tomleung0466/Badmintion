"use client"

import { useState } from "react"
import { Drawer } from "vaul"
import type { Activity, District } from "@/types/activity"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronDown } from "lucide-react"

interface CreateActivitySheetProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (activity: Omit<Activity, "id">) => void
}

const districts: District[] = [
  "觀塘區",
  "將軍澳",
  "沙田區",
  "大埔區",
  "荃灣區",
  "灣仔區",
  "東區",
  "中西區",
  "油尖旺區",
  "九龍城區",
  "深水埗區",
  "黃大仙區",
  "屯門區",
  "元朗區",
  "北區",
  "西貢區",
  "葵青區",
  "離島區",
  "南區",
]

export function CreateActivitySheet({
  isOpen,
  onClose,
  onSubmit,
}: CreateActivitySheetProps) {
  const [formData, setFormData] = useState({
    district: "" as District | "",
    venue: "",
    date: "",
    time: "",
    shuttlecock: "RSL No.1",
    pricePerPerson: "",
    totalSlots: "",
    contactPhone: "",
  })
  const [showDistrictPicker, setShowDistrictPicker] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !formData.district ||
      !formData.venue ||
      !formData.date ||
      !formData.time ||
      !formData.pricePerPerson ||
      !formData.totalSlots ||
      !formData.contactPhone
    ) {
      return
    }

    setIsSubmitting(true)

    // Simulate network delay for smooth animation
    await new Promise((resolve) => setTimeout(resolve, 800))

    const dateObj = new Date(formData.date)
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"]
    const weekday = weekdays[dateObj.getDay()]
    const formattedDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日 (${weekday}) ${formData.time}`

    const newActivity: Omit<Activity, "id"> = {
      district: formData.district as District,
      venue: formData.venue,
      dateTime: formattedDate,
      shuttlecock: formData.shuttlecock,
      pricePerPerson: parseInt(formData.pricePerPerson),
      totalSlots: parseInt(formData.totalSlots),
      remainingSlots: parseInt(formData.totalSlots),
      contactPhone: formData.contactPhone,
    }

    onSubmit(newActivity)
    setIsSubmitting(false)

    // Reset form
    setFormData({
      district: "",
      venue: "",
      date: "",
      time: "",
      shuttlecock: "RSL No.1",
      pricePerPerson: "",
      totalSlots: "",
      contactPhone: "",
    })
  }

  return (
    <>
      <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-[#333333]/20" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex max-h-[92vh] flex-col rounded-t-[20px] border-t border-border bg-card">
            <div className="flex flex-1 flex-col overflow-hidden rounded-t-[20px] bg-card">
              {/* Handle */}
              <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/20" />

              {/* Header */}
              <div className="border-b border-border px-6 py-5">
                <h3 className="text-center text-xl font-medium leading-[1.6] tracking-[0.05em] text-foreground">
                  發佈場地
                </h3>
                <p className="mt-1 text-center text-sm tracking-[0.05em] text-muted-foreground">
                  填寫資料，讓球友加入你的場次
                </p>
              </div>

              {/* Scrollable Form */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* District */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium tracking-[0.05em] text-foreground">
                      地區
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowDistrictPicker(true)}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3.5 text-left transition-colors hover:bg-secondary"
                    >
                      <span
                        className={
                          formData.district
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {formData.district || "選擇地區"}
                      </span>
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Venue */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium tracking-[0.05em] text-foreground">
                      體育館
                    </Label>
                    <Input
                      placeholder="例如：藍田體育館"
                      value={formData.venue}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, venue: e.target.value }))
                      }
                      className="h-12 rounded-xl border-border bg-background px-4 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* Date and Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium tracking-[0.05em] text-foreground">
                        日期
                      </Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, date: e.target.value }))
                        }
                        className="h-12 rounded-xl border-border bg-background px-4 text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium tracking-[0.05em] text-foreground">
                        時間
                      </Label>
                      <Input
                        placeholder="19:00-21:00"
                        value={formData.time}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, time: e.target.value }))
                        }
                        className="h-12 rounded-xl border-border bg-background px-4 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>

                  {/* Shuttlecock */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium tracking-[0.05em] text-foreground">
                      用球
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {["RSL No.1", "Victor Master Ace", "Yonex AS-30", "其他"].map(
                        (option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                shuttlecock: option,
                              }))
                            }
                            className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                              formData.shuttlecock === option
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-background text-foreground hover:bg-secondary"
                            }`}
                          >
                            {option}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Price and Slots */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium tracking-[0.05em] text-foreground">
                        每人費用
                      </Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          $
                        </span>
                        <Input
                          type="number"
                          placeholder="45"
                          value={formData.pricePerPerson}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              pricePerPerson: e.target.value,
                            }))
                          }
                          className="h-12 rounded-xl border-border bg-background pl-8 pr-4 text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium tracking-[0.05em] text-foreground">
                        總人數
                      </Label>
                      <Input
                        type="number"
                        placeholder="8"
                        value={formData.totalSlots}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            totalSlots: e.target.value,
                          }))
                        }
                        className="h-12 rounded-xl border-border bg-background px-4 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>

                  {/* Contact Phone */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium tracking-[0.05em] text-foreground">
                      聯絡電話
                    </Label>
                    <Input
                      type="tel"
                      placeholder="9123 4567"
                      value={formData.contactPhone}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          contactPhone: e.target.value,
                        }))
                      }
                      className="h-12 rounded-xl border-border bg-background px-4 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 pb-6">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-14 w-full rounded-xl border border-border bg-secondary text-base font-medium tracking-[0.08em] text-foreground transition-colors hover:bg-[#e9e9e6] disabled:opacity-70"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <svg
                            className="animate-spin h-5 w-5"
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
                          發佈中...
                        </span>
                      ) : (
                        "發佈場次"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Nested District Picker Drawer */}
      <Drawer.Root
        open={showDistrictPicker}
        onOpenChange={(open) => !open && setShowDistrictPicker(false)}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-[#333333]/20" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[60] mt-24 flex flex-col rounded-t-[20px] border-t border-border bg-card">
            <div className="flex-1 rounded-t-[20px] bg-card">
              {/* Handle */}
              <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/20" />

              {/* Header */}
              <div className="border-b border-border px-6 py-4">
                <h3 className="text-center text-lg font-medium tracking-[0.05em] text-foreground">
                  選擇地區
                </h3>
              </div>

              {/* District List */}
              <div className="max-h-[50vh] overflow-y-auto py-2">
                {districts.map((district) => (
                  <button
                    key={district}
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, district }))
                      setShowDistrictPicker(false)
                    }}
                    className={`w-full px-6 py-4 text-left tracking-[0.05em] transition-colors ${
                      formData.district === district
                        ? "bg-secondary font-medium text-foreground"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {district}
                  </button>
                ))}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  )
}
