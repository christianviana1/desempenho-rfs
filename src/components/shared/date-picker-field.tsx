"use client"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function DatePickerField({
  value,
  onChange,
  disabled,
}: {
  value: Date
  onChange: (date: Date) => void
  disabled?: (date: Date) => boolean
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-start gap-2 font-normal">
          <CalendarIcon className="size-4" />
          {format(value, "dd/MM/yyyy", { locale: ptBR })}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => date && onChange(date)}
          disabled={disabled}
          locale={ptBR}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
