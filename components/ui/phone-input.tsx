'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  Country,
  parsePhoneNumber,
  findCountryByCodeOrDial,
} from '@/lib/utils/country-data'
import { Search, ChevronDown, Check, AlertCircle, Phone } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

export interface PhoneInputProps {
  value?: string
  onChange?: (value: string, isValid: boolean, country: Country) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  id?: string
  name?: string
  className?: string
  inputClassName?: string
  error?: string | boolean
  defaultCountryCode?: string
  showValidationMessage?: boolean
}

export function PhoneInput({
  value = '',
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  required = false,
  id,
  name,
  className,
  inputClassName,
  error,
  defaultCountryCode = 'ET',
  showValidationMessage = true,
}: PhoneInputProps) {
  const initialCountry = findCountryByCodeOrDial(defaultCountryCode) || DEFAULT_COUNTRY
  const [selectedCountry, setSelectedCountry] = useState<Country>(initialCountry)
  const [nationalInput, setNationalInput] = useState<string>('')
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isTouched, setIsTouched] = useState<boolean>(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Initialize & sync value
  useEffect(() => {
    if (!value) {
      setNationalInput('')
      return
    }

    const parsed = parsePhoneNumber(value, selectedCountry)
    if (parsed.country.code !== selectedCountry.code) {
      setSelectedCountry(parsed.country)
    }
    setNationalInput(parsed.nationalDigits)
  }, [value])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    } else {
      setSearchQuery('')
    }
  }, [isOpen])

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter countries by search query
  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dialCode.includes(searchQuery) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Parse current state for validation
  const currentParsing = parsePhoneNumber(
    nationalInput ? `${selectedCountry.dialCode}${nationalInput}` : '',
    selectedCountry
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value

    // If user pastes full E.164 number e.g. "+254712345678" or "0912345678"
    if (raw.startsWith('+')) {
      const parsed = parsePhoneNumber(raw, selectedCountry)
      setSelectedCountry(parsed.country)
      setNationalInput(parsed.nationalDigits)
      onChange?.(parsed.e164, parsed.isValid, parsed.country)
      return
    }

    // Strip non-numeric characters
    let digits = raw.replace(/\D/g, '')

    // If leading zero in local input e.g. "0912345678" for Ethiopia
    if (digits.startsWith('0') && selectedCountry.code === 'ET') {
      digits = digits.substring(1)
    }

    setNationalInput(digits)

    const fullE164 = digits ? `${selectedCountry.dialCode}${digits}` : ''
    const parsed = parsePhoneNumber(fullE164, selectedCountry)
    onChange?.(parsed.e164, parsed.isValid, selectedCountry)
  }

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country)
    setIsOpen(false)

    const fullE164 = nationalInput ? `${country.dialCode}${nationalInput}` : ''
    const parsed = parsePhoneNumber(fullE164, country)
    onChange?.(parsed.e164, parsed.isValid, country)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsTouched(true)
    onBlur?.(e)
  }

  const displayError =
    typeof error === 'string'
      ? error
      : isTouched && nationalInput && !currentParsing.isValid
      ? currentParsing.errorMessage
      : null

  return (
    <div className={cn('w-full space-y-1.5', className)} ref={containerRef}>
      <div
        className={cn(
          'relative flex items-center rounded-xl border bg-background text-foreground transition-all duration-200 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary',
          displayError ? 'border-rose-500 focus-within:ring-rose-500/20' : 'border-border/70 hover:border-border',
          disabled && 'opacity-60 cursor-not-allowed bg-secondary/20'
        )}
      >
        {/* Country Selector Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-2.5 border-r border-border/60 hover:bg-secondary/40 rounded-l-xl transition-colors text-sm font-semibold flex-shrink-0 select-none"
        >
          <span className="text-lg leading-none" role="img" aria-label={selectedCountry.name}>
            {selectedCountry.flag}
          </span>
          <span className="text-xs font-bold text-foreground tracking-wide">{selectedCountry.dialCode}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground transition-transform duration-200" />
        </button>

        {/* National Number Input Field */}
        <input
          id={id}
          name={name}
          type="tel"
          disabled={disabled}
          required={required}
          value={nationalInput}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder || selectedCountry.placeholder}
          className={cn(
            'flex-1 bg-transparent px-3 py-2.5 text-sm font-medium outline-none placeholder:text-muted-foreground/60 w-full rounded-r-xl',
            inputClassName
          )}
        />

        {/* Validation Checkmark / Alert Icon */}
        {nationalInput && (
          <div className="pr-3 flex items-center pointer-events-none">
            {currentParsing.isValid ? (
              <Check className="w-4 h-4 text-emerald-500 animate-in zoom-in duration-200" />
            ) : isTouched ? (
              <AlertCircle className="w-4 h-4 text-rose-500 animate-in zoom-in duration-200" />
            ) : null}
          </div>
        )}

        {/* Searchable Country Dropdown Popover */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 w-72 max-h-80 bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-50 slide-in-from-top-2 duration-150 flex flex-col">
            {/* Search Box */}
            <div className="p-2 border-b border-border/60 bg-secondary/20">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search country or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-background border border-border/60 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Country List */}
            <div className="overflow-y-auto flex-1 p-1 space-y-0.5 max-h-60 no-scrollbar">
              {filteredCountries.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">No country found</div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = c.code === selectedCountry.code
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleCountrySelect(c)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors',
                        isSelected
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'hover:bg-secondary/60 text-foreground font-medium'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base leading-none flex-shrink-0">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground flex-shrink-0 ml-2">
                        {c.dialCode}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* User-friendly Validation Error Message */}
      {showValidationMessage && displayError && (
        <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 animate-in fade-in duration-200">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {displayError}
        </p>
      )}
    </div>
  )
}
