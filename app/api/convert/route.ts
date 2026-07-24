import { NextResponse } from "next/server";

export async function POST() {
  try {
    return NextResponse.json({
      success: true,
      message: "File uploaded successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Conversion failed.",
      },
      {
        status: 500,
      }
    );
  }
}