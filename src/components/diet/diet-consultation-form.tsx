"use client";

import { useMemo, useState } from "react";
import { Activity, Apple, ClipboardList, Dumbbell, HeartPulse, Loader2, MessageCircle, Send, ShieldCheck, Sparkles, Target, TrendingUp, UserRound } from "lucide-react";

const GOOGLE_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyES1_k08eR7bJkcXEDBG1IJQMa4op3TmH9ebg-Uu4_A4aSlK1wFyfuEhI4zQO3TbCi8w/exec";
const ZENITH_WHATSAPP_NUMBER = "919272112745";
const PAID_CONSULTATION_WHATSAPP_NUMBER = "918999699811";
const PAID_CONSULTATION_MESSAGE =
  "Hey Zenith Fitness, I want to have a paid diet consultation. Please schedule me an appointment with our nutritionist whenever possible.";
const PT_CONSULTATION_MESSAGE =
  "Hey Zenith Fitness, I want to start personal training. Please arrange a consultation with a certified trainer whenever possible so we can discuss my goals, training plan, and next steps.";

type Prefill = {
  fullName: string;
  mobileNumber: string | null;
  gender: string | null;
  medicalHistory: string | null;
};

const goals = ["Weight Loss", "Weight Gain", "Muscle Gain", "Fat Loss", "Maintenance", "Medical Diet Support"];
const activityLevels = ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"];
const workouts = ["No Workout", "Walking", "Gym", "Cardio", "Strength Training", "Yoga", "Sports", "Other"];
const dietTypes = ["Vegetarian", "Non-Vegetarian", "Eggetarian", "Jain", "Vegan"];
const medicalConditions = [
  "Diabetes",
  "Blood Pressure",
  "Thyroid",
  "Cholesterol",
  "Acidity/GERD",
  "Constipation",
  "Asthma",
  "PCOD/PCOS",
  "Kidney Issue",
  "Liver Issue",
  "Heart Issue",
  "Joint Pain",
  "None",
];
const planTypes = ["Fat Loss Plan", "Weight Gain Plan", "Muscle Gain Plan", "Maintenance Plan", "Medical Support Plan"];
const cuisines = ["Maharashtrian", "North Indian", "South Indian", "Mixed Indian", "Simple Home Food"];
const personalTrainingServices = [
  { title: "1-1 Personal Training", icon: Dumbbell },
  { title: "Target Based Approach", icon: Target },
  { title: "Goal Setting", icon: Sparkles },
  { title: "Diet Plan", icon: Apple },
  { title: "Certified Trainer Guidance", icon: ShieldCheck },
  { title: "Result Tracking", icon: TrendingUp },
];

function SelectField({ label, name, required, options, defaultValue = "" }: { label: string; name: string; required?: boolean; options: string[]; defaultValue?: string }) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-semibold text-white/78">{label}</span>
      <select name={name} required={required} defaultValue={defaultValue} className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-white outline-none transition focus:border-zenith-400">
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function InputField({ label, name, required, type = "text", placeholder, defaultValue }: { label: string; name: string; required?: boolean; type?: string; placeholder?: string; defaultValue?: string }) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-semibold text-white/78">{label}</span>
      <input name={name} required={required} type={type} placeholder={placeholder} defaultValue={defaultValue} className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-white outline-none transition placeholder:text-white/30 focus:border-zenith-400" />
    </label>
  );
}

function TextAreaField({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return (
    <label className="space-y-2 text-sm sm:col-span-2">
      <span className="font-semibold text-white/78">{label}</span>
      <textarea name={name} rows={3} placeholder={placeholder} className="w-full resize-y rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-zenith-400" />
    </label>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof UserRound; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[.045] p-5 sm:p-6">
      <h2 className="flex items-center gap-3 text-lg font-black">
        <span className="rounded-2xl bg-zenith-500/18 p-2 text-zenith-400"><Icon size={20} /></span>
        {title}
      </h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function DietConsultationForm({ prefill }: { prefill: Prefill }) {
  const [choice, setChoice] = useState<"free" | "pt" | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const defaultMedical = useMemo(() => {
    const value = prefill.medicalHistory?.trim();
    return value ? value.split(",").map((item) => item.trim()) : [];
  }, [prefill.medicalHistory]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const checkedMedical = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="medicalHistory"]:checked')).map((item) => item.value);

    if (checkedMedical.length === 0) {
      setStatus("error");
      setMessage("Please select at least one medical history option.");
      return;
    }

    const data = new FormData(form);
    const payload = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      if (key !== "medicalHistory") payload.append(key, String(value));
    }
    payload.append("medicalHistory", checkedMedical.join(", "));

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, { method: "POST", body: payload });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Submission failed.");

      const clientName = String(data.get("fullName") || "Client").trim();
      const whatsAppText = `Hey Zenithfitness, I am ${clientName}. I have submitted the diet form. Please send me the diet plan when ready.`;
      const whatsAppUrl = `https://wa.me/${ZENITH_WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsAppText)}`;

      form.reset();
      setStatus("success");
      setMessage("Consultation submitted successfully. Our team will prepare your diet plan.");
      window.open(whatsAppUrl, "_blank", "noopener,noreferrer") ?? (window.location.href = whatsAppUrl);
    } catch (error) {
      setStatus("error");
      setMessage(`Unable to submit right now. ${error instanceof Error ? error.message : "Please try again."}`);
    }
  }

  function openPaidConsultation() {
    const url = `https://wa.me/${PAID_CONSULTATION_WHATSAPP_NUMBER}?text=${encodeURIComponent(PAID_CONSULTATION_MESSAGE)}`;
    window.open(url, "_blank", "noopener,noreferrer") ?? (window.location.href = url);
  }

  function openPtConsultation() {
    const url = `https://wa.me/${PAID_CONSULTATION_WHATSAPP_NUMBER}?text=${encodeURIComponent(PT_CONSULTATION_MESSAGE)}`;
    window.open(url, "_blank", "noopener,noreferrer") ?? (window.location.href = url);
  }

  if (choice === "pt") {
    return (
      <section className="space-y-5">
        <button type="button" onClick={() => setChoice(null)} className="inline-flex min-h-11 items-center rounded-2xl border border-amber-300/25 px-4 text-sm font-semibold text-amber-100">
          Change Diet / PT option
        </button>

        <div className="overflow-hidden rounded-3xl border border-amber-300/45 bg-[linear-gradient(145deg,rgba(68,45,9,.96),rgba(13,12,10,.98)_48%,rgba(105,76,18,.92))] p-5 shadow-2xl shadow-amber-500/10 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-300/12 px-3 py-1 text-xs font-black uppercase tracking-widest text-amber-200">
                <Sparkles size={14} />
                Premium
              </span>
              <h2 className="mt-4 text-2xl font-black text-amber-50 sm:text-3xl">Get Personal Training Consultation</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-50/72">
                Start with a trainer-led consultation built around your body, goals, routine, and diet support.
              </p>
            </div>
            <span className="rounded-2xl bg-amber-300 p-3 text-[#1b1304] shadow-lg shadow-amber-300/20">
              <Dumbbell size={28} />
            </span>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {personalTrainingServices.map(({ title, icon: Icon }) => (
              <div key={title} className="flex min-h-16 items-center gap-3 rounded-2xl border border-amber-200/18 bg-black/22 px-4 text-amber-50">
                <span className="rounded-xl bg-amber-300/16 p-2 text-amber-200">
                  <Icon size={19} />
                </span>
                <span className="font-bold">{title}</span>
              </div>
            ))}
          </div>

          <button type="button" onClick={openPtConsultation} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-5 font-black text-[#1b1304] shadow-lg shadow-amber-300/20 transition hover:bg-amber-200 sm:w-auto">
            <MessageCircle size={19} />
            Book PT Consultation on WhatsApp
          </button>
        </div>
      </section>
    );
  }

  if (choice !== "free") {
    return (
      <section className="grid gap-4 md:grid-cols-3">
        <button type="button" onClick={() => setChoice("free")} className="group min-h-64 rounded-3xl border border-zenith-400/30 bg-zenith-500/10 p-6 text-left transition hover:border-zenith-300 hover:bg-zenith-500/15">
          <span className="inline-flex rounded-2xl bg-zenith-500/20 p-3 text-zenith-300">
            <Apple size={26} />
          </span>
          <h2 className="mt-5 text-2xl font-black">Free Diet Plan</h2>
          <p className="mt-3 text-sm leading-6 text-white/62">Includes only diet plan.</p>
          <span className="mt-8 inline-flex min-h-11 items-center justify-center rounded-2xl bg-zenith-500 px-5 font-bold text-[#07110e]">
            Open Form
          </span>
        </button>

        <button type="button" onClick={openPaidConsultation} className="group min-h-64 rounded-3xl border border-white/10 bg-white/[.045] p-6 text-left transition hover:border-zenith-300/60 hover:bg-white/[.07]">
          <span className="inline-flex rounded-2xl bg-white/10 p-3 text-zenith-300">
            <MessageCircle size={26} />
          </span>
          <h2 className="mt-5 text-2xl font-black">Paid Diet Consultation</h2>
          <p className="mt-3 text-sm leading-6 text-white/62">Includes 1 on 1 consultation with a certified nutritionist, diet plan, and doubt clearing.</p>
          <div className="mt-5 flex items-center justify-between gap-3">
            <strong className="text-2xl text-zenith-300">Rs 1000</strong>
            <span className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-zenith-400/40 px-5 font-bold text-zenith-300">
              WhatsApp
            </span>
          </div>
        </button>

        <button type="button" onClick={() => setChoice("pt")} className="group min-h-64 rounded-3xl border border-amber-300/45 bg-[linear-gradient(145deg,rgba(94,65,12,.9),rgba(20,17,12,.98)_55%,rgba(149,107,24,.8))] p-6 text-left shadow-2xl shadow-amber-500/10 transition hover:border-amber-200 hover:shadow-amber-400/20">
          <span className="inline-flex rounded-2xl bg-amber-300 p-3 text-[#1b1304]">
            <Dumbbell size={26} />
          </span>
          <h2 className="mt-5 text-2xl font-black text-amber-50">Get Personal Training Consultation</h2>
          <p className="mt-3 text-sm leading-6 text-amber-50/70">Premium trainer guidance with goal setting, diet support, and result tracking.</p>
          <span className="mt-8 inline-flex min-h-11 items-center justify-center rounded-2xl border border-amber-200/55 px-5 font-bold text-amber-100">
            Open PT
          </span>
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <button type="button" onClick={() => setChoice(null)} className="inline-flex min-h-11 items-center rounded-2xl border border-white/10 px-4 text-sm text-white/65">
        Change diet option
      </button>

      {status !== "idle" && status !== "loading" && (
        <div className={`rounded-2xl border p-4 text-sm ${status === "success" ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100" : "border-red-300/25 bg-red-400/10 text-red-100"}`} role="status">
          {message}
        </div>
      )}

      <Section icon={UserRound} title="Client Basic Details">
        <InputField label="Full Name" name="fullName" required defaultValue={prefill.fullName} />
        <InputField label="Mobile Number" name="mobileNumber" required type="tel" placeholder="10 digit mobile number" defaultValue={prefill.mobileNumber ?? ""} />
        <InputField label="Age" name="age" required type="number" />
        <SelectField label="Gender" name="gender" required options={["Male", "Female", "Other"]} defaultValue={prefill.gender ?? ""} />
        <InputField label="Height" name="height" required placeholder="e.g. 170 cm" />
        <InputField label="Current Weight" name="currentWeight" required placeholder="e.g. 78 kg" />
        <InputField label="Target Weight" name="targetWeight" required placeholder="e.g. 70 kg" />
        <SelectField label="Goal" name="goal" required options={goals} />
        <InputField label="Time Period to Achieve Goal" name="goalTimeline" required placeholder="e.g. 12 weeks" />
        <InputField label="Occupation" name="occupation" />
      </Section>

      <Section icon={Activity} title="Lifestyle Details">
        <SelectField label="Daily Activity Level" name="activityLevel" required options={activityLevels} />
        <SelectField label="Workout Currently Doing" name="currentWorkout" required options={workouts} />
        <InputField label="Workout Days per Week" name="workoutDays" type="number" />
        <InputField label="Sleep Hours" name="sleepHours" placeholder="e.g. 7 hours" />
        <InputField label="Wake-up Time" name="wakeUpTime" type="time" />
        <InputField label="Bed Time" name="bedTime" type="time" />
        <InputField label="Water Intake per Day" name="waterIntake" placeholder="e.g. 3 litres" />
        <SelectField label="Stress Level" name="stressLevel" required options={["Low", "Medium", "High"]} />
      </Section>

      <Section icon={Apple} title="Eating Habits">
        <SelectField label="Diet Type" name="dietType" required options={dietTypes} />
        <InputField label="Breakfast Time" name="breakfastTime" type="time" />
        <TextAreaField label="Breakfast Details" name="breakfastDetails" placeholder="Meals and proportions" />
        <InputField label="Lunch Time" name="lunchTime" type="time" />
        <TextAreaField label="Lunch Details" name="lunchDetails" placeholder="Meals and proportions" />
        <InputField label="Evening Snacks Time" name="eveningSnacksTime" type="time" />
        <TextAreaField label="Evening Snacks Details" name="eveningSnacksDetails" placeholder="Snacks and proportions" />
        <InputField label="Dinner Time" name="dinnerTime" type="time" />
        <TextAreaField label="Dinner Details" name="dinnerDetails" placeholder="Meals and proportions" />
        <InputField label="Tea/Coffee Intake" name="teaCoffeeIntake" placeholder="e.g. 2 cups/day" />
        <SelectField label="Sugar Intake" name="sugarIntake" required options={["No Sugar", "Low", "Medium", "High"]} />
        <SelectField label="Outside Food Frequency" name="outsideFoodFrequency" required options={["Rarely", "Weekly", "2-3 times a week", "Daily"]} />
        <InputField label="Food Allergies" name="foodAllergies" />
        <InputField label="Foods Disliked" name="foodsDisliked" />
        <InputField label="Foods Preferred" name="foodsPreferred" />
      </Section>

      <Section icon={HeartPulse} title="Medical History">
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-semibold text-white/78">Medical Conditions</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {medicalConditions.map((condition) => (
              <label key={condition} className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white/75">
                <input type="checkbox" name="medicalHistory" value={condition} defaultChecked={defaultMedical.includes(condition)} className="accent-[#e5c553]" />
                {condition}
              </label>
            ))}
          </div>
        </fieldset>
        <TextAreaField label="Current Medicines" name="currentMedicines" />
        <TextAreaField label="Past Surgery or Injury" name="pastSurgeryInjury" />
        <TextAreaField label="Doctor Restrictions" name="doctorRestrictions" />
        <TextAreaField label="Any Other Medical Note" name="otherMedicalNote" />
      </Section>

      <Section icon={ClipboardList} title="Diet Plan Requirement">
        <SelectField label="Plan Type" name="planType" required options={planTypes} />
        <SelectField label="Preferred Cuisine" name="preferredCuisine" required options={cuisines} />
        <SelectField label="Budget" name="budget" required options={["Low Budget", "Medium Budget", "Premium"]} />
        <SelectField label="Meal Frequency" name="mealFrequency" required options={["3 Meals", "4 Meals", "5 Meals", "6 Meals"]} />
        <InputField label="Supplements Used" name="supplementsUsed" placeholder="e.g. whey protein, creatine, none" />
        <TextAreaField label="Special Instructions" name="specialInstructions" />
      </Section>

      <div className="rounded-3xl border border-white/10 bg-[#10201b]/95 p-4 shadow-2xl sm:flex sm:items-center sm:justify-between">
        <p className="text-sm text-white/50">Fields marked required must be completed.</p>
        <button type="submit" disabled={status === "loading"} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zenith-500 px-5 font-bold text-[#07110e] disabled:opacity-70 sm:mt-0 sm:w-auto">
          {status === "loading" ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          Submit Consultation
        </button>
      </div>
    </form>
  );
}
