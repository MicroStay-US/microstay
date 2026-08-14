"use client";

import { FormEvent } from "react";

export default function ContactPage() {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  const form = e.currentTarget;

  const firstName = (
    form.elements.namedItem("firstName") as HTMLInputElement
  ).value;

  const lastName = (
    form.elements.namedItem("lastName") as HTMLInputElement
  ).value;

  const email = (
    form.elements.namedItem("email") as HTMLInputElement
  ).value;

  const subject = (
    form.elements.namedItem("subject") as HTMLInputElement
  ).value;

  const message = (
    form.elements.namedItem("message") as HTMLTextAreaElement
  ).value;

  const fullName = `${firstName} ${lastName}`.trim();

  const emailBody = `Hello MicroStay Support,

You have received a new inquiry through the MicroStay Contact Form.

────────────────────────────
CONTACT DETAILS
────────────────────────────

Name: ${fullName}
Email: ${email}

────────────────────────────
MESSAGE
────────────────────────────

${message}

────────────────────────────

This message was submitted through the MicroStay website.

Regards,
${fullName}`;

  const gmailUrl =
    `https://mail.google.com/mail/?view=cm&fs=1` +
    `&to=${encodeURIComponent("adminmotel@gmail.com")}` +
    `&su=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(emailBody)}`;

  window.open(gmailUrl, "_blank");
};

  return (
    <section className="min-h-screen bg-slate-200 dark:bg-slate-950 dark:text-white">

      {/* Hero Section */}
      <div className="relative overflow-hidden border-b dark:border-slate-800">
        <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-orange-500/10 dark:via-slate-950 dark:to-cyan-500/10  " />

        <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="max-w-4xl">

            <span className="inline-flex items-center rounded-full border dark:border-orange-500/20 dark:bg-orange-500/10 px-4 py-2 text-sm font-medium dark:text-orange-400 bg-ms-orange text-white">
              Contact MicroStay
            </span>

            <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">
              We&apos;re Here to
              <span className="text-orange-500"> Help You</span>
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 dark:text-slate-300">
              Have questions about bookings, partnerships, property listings,
              or your MicroStay experience? Our team is ready to assist you.
              Reach out and we&apos;ll get back to you as quickly as possible.
            </p>

          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="mx-auto max-w-7xl px-6  lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">

          {/* Contact Form */}
          <div className="rounded-3xl border border-ms-orange bg-ms-orange-light dark:border-slate-800 border-transparent dark:bg-slate-900/60 p-8 backdrop-blur-sm">

            <div className="mb-8">
              <h2 className="text-3xl font-bold">
                Send Us a Message
              </h2>

              <p className="mt-3 text-slate-400">
                Fill out the form below and our team will contact you shortly.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >

              {/* First + Last Name */}
              <div className="grid gap-6 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-medium dark:text-slate-300">
                    First Name
                  </label>

                  <input
                    name="firstName"
                    type="text"
                    placeholder="John"
                    required
                    className="w-full rounded-xl border dark:border-slate-700 dark:bg-slate-950 px-4 py-3 dark:text-white outline-none transition dark:focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium dark:text-slate-300">
                    Last Name
                  </label>

                  <input
                    name="lastName"
                    type="text"
                    placeholder="Doe"
                    required
                    className="w-full rounded-xl border dark:border-slate-700 dark:bg-slate-950 px-4 py-3 dark:text-white outline-none transition dark:focus:border-orange-500"
                  />
                </div>

              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium dark:text-slate-300">
                  Email Address
                </label>

                <input
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  required
                  className="w-full rounded-xl border dark:border-slate-700 dark:bg-slate-950 px-4 py-3 dark:text-white outline-none transition dark:focus:border-orange-500"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="mb-2 block text-sm font-medium dark:text-slate-300">
                  Subject
                </label>

                <input
                  name="subject"
                  type="text"
                  placeholder="How can we help?"
                  required
                  className="w-full rounded-xl border dark:border-slate-700 dark:bg-slate-950 px-4 py-3 dark:text-white outline-none transition dark:focus:border-orange-500"
                />
              </div>

              {/* Message */}
              <div>
                <label className="mb-2 block text-sm font-medium dark:text-slate-300">
                  Message
                </label>

                <textarea
                  name="message"
                  rows={6}
                  placeholder="Write your message here..."
                  required
                  className="w-full rounded-xl border dark:border-slate-700 dark:bg-slate-950 px-4 py-3 dark:text-white outline-none transition dark:focus:border-orange-500"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full rounded-xl bg-orange-500 px-6 py-4 font-semibold text-white transition hover:bg-orange-600"
              >
                Send Message
              </button>

            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">

            {/* Contact Information Card */}
            <div className="rounded-3xl border bg-ms-orange-light dark:border-slate-800 dark:bg-slate-900/60 p-8">

              <h3 className="text-2xl font-bold text-orange-500">
                Contact Information
              </h3>

              <p className="mt-4 dark:text-slate-400">
                Get in touch through following channel.
              </p>

              <div className="mt-8 space-y-6">

                {/* Email */}
                <div className="rounded-2xl border dark:border-slate-800 dark:bg-slate-950 p-5">

                  <h4 className="font-semibold dark:text-white">
                    Email &amp; Business Support
                  </h4>

                  <p className="mt-2 dark:text-slate-400">
                    For Motel related queries contact  
                    <span className="text-ms-orange"> support@microstay.us </span>
                    within 48 hours
                  </p>

                </div>

                {/* Customer Care */}
                {/* <div className="rounded-2xl border dark:border-slate-800 dark:bg-slate-950 p-5">

                  <h4 className="font-semibold dark:text-white">
                    Customer Care
                  </h4>

                  <p className="mt-2 dark:text-slate-400 text-ms-orange">
                    Available 24/7 to assist guests and partners.
                  </p>

                </div> */}

              </div>
            </div>

            {/* Partner Card */}
            {/* <div className="rounded-3xl border bg-ms-orange-light dark:border-slate-800 dark:bg-black p-8">

              <h3 className="text-2xl font-bold text-ms-orange">
                Partner With MicroStay
              </h3>

              <p className="mt-4 dark:text-slate-300 text-black/60 leading-7">
                Own a hotel, resort, or property? Join our growing network and
                connect with travelers looking for flexible short-duration
                stays.
              </p>

              <button
                type="button"
                className="mt-6 rounded-xl border border-orange-500 px-6 py-3 font-semibold text-orange-500 transition hover:bg-orange-500 hover:text-white"
              >
                Become a Partner
              </button>

            </div> */}

            {/* Response Time */}
            {/* <div className="rounded-3xl border bg-ms-orange-light dark:border-slate-800 dark:bg-slate-900/60 p-8">

              <h3 className="text-2xl font-bold">
                Response Time
              </h3>

              <p className="mt-4 dark:text-slate-400 text-black/60">
                We typically respond to inquiries within 24 business hours.
                For urgent booking-related matters, please use the support
                channels listed above.
              </p>

            </div> */}

          </div>
        </div>
      </div>

      {/* FAQ Preview */}
      <div className="border-t dark:border-slate-800 dark:bg-slate-900/40">

        <div className="mx-auto max-w-7xl px-6 py-5 lg:px-8">

          <div className="text-center">

            <h2 className="text-4xl font-bold text-ms-orange">
              Frequently Asked Questions
            </h2>

            <p className="mt-4 dark:text-slate-400">
              Quick answers to common questions.
            </p>

          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">

            {/* FAQ 1 */}
            <div className="rounded-2xl border bg-ms-orange-light dark:border-slate-800 dark:bg-slate-950 p-6">

              <h3 className="font-semibold">
                How does hourly booking work?
              </h3>

              <p className="mt-3 text-sm text-slate-400">
                Choose a property, select your preferred duration, and pay
                only for the time you need.
              </p>

            </div>

            {/* FAQ 2 */}
            <div className="rounded-2xl border dark:border-slate-800 dark:bg-slate-950 p-6 bg-ms-orange-light">

              <h3 className="font-semibold">
                Can I modify my reservation?
              </h3>

              <p className="mt-3 text-sm text-slate-400">
                Reservation modifications depend on property policies and
                availability.
              </p>

            </div>

            {/* FAQ 3 */}
            <div className="rounded-2xl border dark:border-slate-800 dark:bg-slate-950 p-6 bg-ms-orange-light">

              <h3 className="font-semibold">
                How do I list my property?
              </h3>

              <p className="mt-3 text-sm text-slate-400">
                Contact our support team to begin the onboarding process.
              </p>

            </div>

          </div>
        </div>
      </div>

    </section>
  );
}