import type { Metadata } from "next";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = {
  title: "Sign Up",
};

export default function SignUpPage() {
  return <SignUpForm />;
}
