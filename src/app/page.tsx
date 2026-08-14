export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <main className="flex flex-col items-center justify-center gap-8 text-center px-6">
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white">
          BookMyNai
        </h1>
        <p className="text-xl md:text-2xl text-slate-700 dark:text-slate-300 max-w-2xl">
          Online Salon Appointment & Home Barber Booking Platform
        </p>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
          Project setup completed.
        </p>
      </main>
    </div>
  );
}
