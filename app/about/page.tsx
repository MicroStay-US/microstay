export default function AboutUs() {
  return (
    <section className="dark:bg-slate-950 dark:text-white bg-slate-200">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-orange-500/10 dark:via-slate-950 dark:to-cyan-500/10" />

        <div className="relative mx-auto max-w-7xl px-6  mt-10 lg:px-8 border-b-black/30 border border-solid">
          <div className="max-w-4xl ">
            <span className="inline-flex items-center bg-ms-orange text-white rounded-full border dark:border-orange-500/20 dark:bg-orange-500/10 px-4 py-2 text-sm font-medium dark:text-orange-400">
              About MicroStay
            </span>

            <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">
              Flexible Stays for
              <span className="text-orange-500"> Modern Travelers</span>
            </h1>

            <p className="mt-6 text-lg leading-8 dark:text-slate-300 ">
              At MicroStay, we believe travelers should only pay for the time
              they actually need. Whether you`re between meetings, waiting for a
              flight, working remotely, or simply looking for a comfortable
              space to relax, MicroStay makes hospitality more flexible,
              affordable, and accessible.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-y dark:border-slate-800 dark:bg-slate-900/50 border-b-black/30 border border-solid">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4">
          <div className="bg-orange-300/60 dark:bg-transparent p-5 text-center rounded-lg">
            <h3 className="text-3xl font-bold text-orange-500">Growing</h3>
            <p className="mt-2 dark:text-slate-400">Partner Network</p>
          </div>

          <div className="bg-orange-300/60 dark:bg-transparent p-5 text-center rounded-lg">
            <h3 className="text-3xl font-bold text-orange-500">24/7</h3>
            <p className="mt-2 dark:text-slate-400">Booking Availability</p>
          </div>

          <div className="bg-orange-300/60 dark:bg-transparent p-5 text-center rounded-lg">
            <h3 className="text-3xl font-bold text-orange-500">Flexible</h3>
            <p className="mt-2 dark:text-slate-400">Hourly Stays</p>
          </div>

          <div className="bg-orange-300/60 dark:bg-transparent p-5 text-center rounded-lg">
            <h3 className="text-3xl font-bold text-orange-500">Trusted</h3>
            <p className="mt-2 dark:text-slate-400">By Modern Travelers</p>
          </div>
        </div>
      </div>

      {/* Mission */}
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-2">
          <div>
            <h2 className="text-4xl font-bold">Our Mission : <span className="text-ms-orange">Flexibility</span>
            </h2>

            <p className="mt-6 dark:text-slate-300 leading-8">
              To redefine hospitality by making accommodation more flexible,
              convenient, and efficient. We connect guests with quality spaces
              that fit their schedule instead of forcing them into traditional
              overnight booking models.
            </p>
          </div>

          <div className="rounded-3xl border dark:border-slate-800 dark:bg-slate-900 p-8 bg-orange-300/70">
            <h3 className="text-2xl font-semibold text-orange-500 ">
              Why We Exist ?
            </h3>

            <p className="mt-4 dark:text-slate-300 leading-7 opacity-80">
              Modern travel has changed. People need spaces for a few hours,
              not always an entire night. MicroStay was built to provide a
              smarter booking experience that adapts to the needs of today`s
              travelers, professionals, and digital lifestyles.
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-6  lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold">
              What We Offer
            </h2>

            <p className="mt-4 dark:text-slate-400">
              Designed for flexibility, comfort, and convenience.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border dark:border-slate-800 dark:bg-slate-950 p-6 bg-orange-300/60">
              <h3 className="text-xl font-semibold text-orange-500">
                Flexible Booking
              </h3>

              <p className="mt-3 dark:text-slate-400">
                Book rooms for only the hours you need.
              </p>
            </div>

            <div className="rounded-2xl border dark:border-slate-800 dark:bg-slate-950 p-6 bg-orange-300/60">
              <h3 className="text-xl font-semibold text-orange-500">
                Transit Stays
              </h3>

              <p className="mt-3 dark:text-slate-400">
                Perfect for layovers, travel breaks, and waiting periods.
              </p>
            </div>

            <div className="rounded-2xl border dark:border-slate-800 dark:bg-slate-950 p-6 bg-orange-300/60">
              <h3 className="text-xl font-semibold text-orange-500">
                Workspaces
              </h3>

              <p className="mt-3 dark:text-slate-400">
                Quiet and productive environments for remote work.
              </p>
            </div>

            <div className="rounded-2xl border dark:border-slate-800 dark:bg-slate-950 p-6 bg-orange-300/60">
              <h3 className="text-xl font-semibold text-orange-500">
                Relax & Recharge
              </h3>

              <p className="mt-3 dark:text-slate-400">
                Rest, refresh, and prepare for your next destination.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Vision */}
      <div className="mx-auto max-w-7xl px-6 py-5 lg:px-8">
        <div className="rounded-3xl border bg-orange-300/40 dark:bg-slate-900/40 border-slate-800  border-transparent p-12">
          <h2 className="text-4xl font-bold">
            Our Vision
          </h2>

          <p className="mt-6 max-w-4xl dark:text-slate-300 leading-8">
            We envision a future where hospitality adapts to people—not the
            other way around. MicroStay is building a platform that enables
            travelers to access comfortable spaces whenever they need them,
            whether for work, rest, travel transitions, or personal downtime.
          </p>
        </div>
      </div>

      {/* Audience */}
      <div className="dark:bg-slate-900/50 bg-orange-400/20">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <h2 className="text-center text-4xl font-bold text-ms-orange">
            Who We Serve
          </h2>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            {[
              "Business Travelers",
              "Remote Workers",
              "Digital Nomads",
              "Transit Passengers",
              "Day Travelers",
              "Event Attendees",
              "Families",
              "Modern Explorers",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-transparent dark:border-slate-700 px-5 py-3 dark:text-slate-300 bg-ms-orange-light dark:bg-slate-950 "
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="rounded-3xl bg-amber-300/30 border-slate-300 border dark:bg-slate-900 dark:border-transparent text-white  p-12 text-center">
          <h2 className="text-4xl font-bold text-black/40 dark:text-white/50">
            Join the New Way to Stay
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-800 dark:text-orange-50">
            Whether you`re traveling, working remotely, or simply looking for a
            comfortable place to recharge, MicroStay helps you make every hour
            count.
          </p>

          <button className="mt-8 rounded-xl bg-ms-orange dark:hover:scale-105  px-8 py-4 font-semibold  transition  active:scale-90">
            Explore Stays
          </button>
        </div>
      </div>
    </section>
  );
}
