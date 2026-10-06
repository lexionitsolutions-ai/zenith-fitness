import { Clock3, MapPin, Phone } from "lucide-react";

export function GymDetails() {
  return <section className="mt-10 grid gap-5 md:grid-cols-2" aria-label="About Zenith Fitness">
    <article className="visitor-card">
      <p className="visitor-eyebrow">MORE THAN A WORKOUT</p>
      <h2 className="mt-2 text-2xl font-black">Everything for your fitness journey</h2>
      <ul className="mt-5 space-y-3 text-sm text-white/75">
        <li>Strength training, cardio zone and premium gym equipment</li>
        <li>Group batches: Functional, Zumba and Yoga</li>
        <li>Free BMI checkup every 45 days</li>
        <li>Free diet plan with memberships of 3 months and above</li>
        <li>Free steam sessions every month</li>
      </ul>
      <a href="#trial" className="visitor-button mt-6">Book your free one-day trial</a>
    </article>
    <article className="visitor-card">
      <p className="visitor-eyebrow">COME VISIT US</p>
      <h2 className="mt-2 text-2xl font-black">Your gym in Kolhapur</h2>
      <p className="mt-5 flex items-start gap-3 text-sm text-white/75"><MapPin size={19} className="shrink-0 text-zenith-300"/>Behind ITI College, Hanuman Nagar, Pachgaon Road, Kolhapur.</p>
      <div className="mt-5 flex items-start gap-3"><Clock3 size={19} className="shrink-0 text-zenith-300"/><div className="space-y-2 text-sm text-white/75"><p><span className="font-bold text-white">Monday–Saturday:</span> 6:00 AM–11:00 PM (full day)</p><p><span className="font-bold text-white">Sunday morning:</span> 6:30 AM–10:00 AM</p><p><span className="font-bold text-white">Sunday evening:</span> 5:00 PM–9:00 PM</p></div></div>
      <div className="mt-6 flex flex-wrap gap-3"><a href="tel:+919272112745" className="visitor-secondary"><Phone size={17}/>9272112745</a><a href="https://www.instagram.com/zenithfitness360" target="_blank" rel="noopener noreferrer" className="visitor-secondary">Instagram: @zenithfitness360</a></div>
    </article>
  </section>;
}
