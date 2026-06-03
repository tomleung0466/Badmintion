export type District = 
  | "全港"
  | "觀塘區"
  | "將軍澳"
  | "沙田區"
  | "大埔區"
  | "荃灣區"
  | "灣仔區"
  | "東區"
  | "中西區"
  | "油尖旺區"
  | "九龍城區"
  | "深水埗區"
  | "黃大仙區"
  | "屯門區"
  | "元朗區"
  | "北區"
  | "西貢區"
  | "葵青區"
  | "離島區"
  | "南區"

export interface Activity {
  id: string
  district: District
  venue: string
  dateTime: string
  shuttlecock: string
  pricePerPerson: number
  totalSlots: number
  remainingSlots: number
  contactPhone: string
}
