import { NextResponse } from "next/server"
import { ZodError } from "zod"

export class AppError extends Error {
  constructor(
    public message: string,
    public status = 500,
    public code = "INTERNAL_ERROR",
  ) {
    super(message)
    this.name = "AppError"
  }
}

export function handleError(error: unknown) {
  console.error("[API Error]", error)

  if (error instanceof ZodError) {
    const fieldErrors = error.issues.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }))
    return NextResponse.json(
      {
        error: "Validation error",
        code: "VALIDATION_ERROR",
        details: fieldErrors,
      },
      { status: 400 },
    )
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.status },
    )
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      error: "Unknown error occurred",
      code: "UNKNOWN_ERROR",
    },
    { status: 500 },
  )
}
