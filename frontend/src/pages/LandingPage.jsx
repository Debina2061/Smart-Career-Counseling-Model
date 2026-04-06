import Footer from "../components/Footer";
import Header from "../components/Header";
import { Link } from "react-router-dom";
import {
  FaArrowRight,
  FaBullseye,
  FaChartLine,
  FaComments,
  FaFileAlt,
  FaLightbulb,
} from "react-icons/fa";

const heroCards = [
  {
    title: "ATS Resume Score",
    subtitle: "Optimized for success",
    value: "92%",
    icon: FaFileAlt,
    tone: "border-[#d8ddff] bg-[#eef2ff]",
    iconTone: "bg-[#5047ec] text-white",
    valueTone: "text-[#059669]",
  },
  {
    title: "Career Match",
    subtitle: "Personalized for you",
    value: "88%",
    icon: FaBullseye,
    tone: "border-[#bde8d4] bg-[#dff7ea]",
    iconTone: "bg-[#0ea371] text-white",
    valueTone: "text-[#059669]",
  },
  {
    title: "AI Insights",
    subtitle: "Smart recommendations",
    value: "Ready",
    icon: FaLightbulb,
    tone: "border-[#d3e3ff] bg-[#eaf1ff]",
    iconTone: "bg-[#2864e5] text-white",
    valueTone: "text-[#2864e5]",
  },
];

const trustStats = [
  { value: "10K+", label: "Students Guided" },
  { value: "95%", label: "Success Rate" },
  { value: "500+", label: "Career Paths" },
];

const featureCards = [
  {
    title: "ATS Resume Scanner",
    description:
      "Optimize your resume with AI-powered ATS scoring and get actionable improvement suggestions.",
    icon: FaFileAlt,
    iconTone: "bg-[#5146ff]",
  },
  {
    title: "Career Recommendations",
    description:
      "Get personalized career paths based on your skills, interests, and market demand.",
    icon: FaBullseye,
    iconTone: "bg-[#0ea371]",
  },
  {
    title: "AI Chatbot Coach",
    description:
      "24/7 AI guidance for career questions, interview prep, and skill development advice.",
    icon: FaComments,
    iconTone: "bg-[#2864e5]",
  },
  {
    title: "Skill Gap Analysis",
    description:
      "Identify missing skills for your dream career and get a personalized learning roadmap.",
    icon: FaChartLine,
    iconTone: "bg-[#db2777]",
  },
];

const steps = [
  {
    number: "1",
    title: "Create Your Profile",
    description:
      "Sign up and complete your profile with your skills, education, and career interests.",
    tone: "bg-[#5146ff]",
  },
  {
    number: "2",
    title: "Upload Your Resume",
    description:
      "Get instant ATS scoring and personalized career recommendations based on your experience.",
    tone: "bg-[#0ea371]",
  },
  {
    number: "3",
    title: "Get Job-Ready",
    description:
      "Follow your personalized roadmap, improve your skills, and apply with confidence.",
    tone: "bg-[#2864e5]",
  },
];

const resultCards = [
  {
    value: "10,000+",
    label: "Students Successfully Guided",
    tone: "bg-[#edf0ff] border-[#d8ddff] text-[#5146ff]",
  },
  {
    value: "85%",
    label: "Average ATS Score Improvement",
    tone: "bg-[#e2f7ea] border-[#bde8d4] text-[#0a8f62]",
  },
  {
    value: "95%",
    label: "Student Satisfaction Rate",
    tone: "bg-[#fff4d8] border-[#f6df98] text-[#d97706]",
  },
];

function LandingPage() {
  return (
    <div className="landing-shell min-h-screen">
      <Header />

      <main>
        <section className="py-12 sm:py-14 lg:py-16">
          <div className="landing-container grid gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)] lg:items-center">
            <div className="reveal-rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d7ddff] bg-[#eef1ff] px-4 py-2 text-xs font-semibold text-[#5146ff]">
                AI-Powered Career Guidance
              </span>

              <h1 className="landing-display mt-6 max-w-2xl text-[2.45rem] font-bold leading-[1.05] text-[#111827] sm:text-[3.25rem] lg:text-[4rem]">
                Your Path to a
                <span className="block text-[#5146ff]">Successful</span>
                <span className="block text-[#5146ff]">Career</span>
                Starts Here
              </h1>

              <p className="mt-5 max-w-xl text-base leading-8 text-[#526274] sm:text-lg">
                Get personalized career recommendations, optimize your resume for ATS systems,
                identify skill gaps, and receive AI-powered guidance to become job-ready.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/getstarted"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5146ff] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#4338ca] sm:text-base"
                >
                  Start Your Journey
                  <FaArrowRight className="text-xs" />
                </Link>
                <Link
                  to="/signin"
                  className="inline-flex items-center justify-center rounded-xl border border-[#c7cdf7] bg-white px-6 py-3 text-sm font-semibold text-[#5146ff] transition hover:border-[#5146ff] sm:text-base"
                >
                  Sign In
                </Link>
              </div>

              <div className="mt-10 grid max-w-md grid-cols-3 gap-3 sm:max-w-lg sm:gap-6">
                {trustStats.map((item) => (
                  <div key={item.label}>
                    <p className="landing-display text-3xl font-bold text-[#5146ff]">{item.value}</p>
                    <p className="mt-1 text-sm text-[#6b7a8f]">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal-rise reveal-delay-1">
              <div className="landing-surface rounded-3xl border-[#e2e7ef] bg-white p-4 shadow-[0_24px_55px_rgba(15,23,42,0.14)] sm:p-5">
                <div className="space-y-3">
                  {heroCards.map((card) => {
                    const Icon = card.icon;

                    return (
                      <div
                        key={card.title}
                        className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${card.tone}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconTone}`}>
                            <Icon />
                          </span>
                          <div>
                            <p className="text-sm font-bold text-[#1f2937] sm:text-base">{card.title}</p>
                            <p className="text-xs text-[#5d6c80] sm:text-sm">{card.subtitle}</p>
                          </div>
                        </div>
                        <div className={`text-lg font-bold sm:text-2xl ${card.valueTone}`}>{card.value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="bg-white py-16 sm:py-20">
          <div className="landing-container">
            <div className="mx-auto max-w-3xl text-center reveal-rise">
              <h2 className="landing-display text-3xl font-bold text-[#111827] sm:text-4xl">Everything You Need to Succeed</h2>
              <p className="mt-3 text-base text-[#6b7a8f] sm:text-lg">Powerful tools to help you become job-ready</p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {featureCards.map((feature, index) => {
                const Icon = feature.icon;
                const delayClass = index === 0 ? "" : index === 1 ? "reveal-delay-1" : "reveal-delay-2";

                return (
                  <article
                    key={feature.title}
                    className={`reveal-rise ${delayClass} rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]`}
                  >
                    <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${feature.iconTone}`}>
                      <Icon />
                    </span>
                    <h3 className="landing-display mt-4 text-2xl font-bold text-[#1f2937]">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[#526274] sm:text-base">{feature.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="process" className="py-16 sm:py-20">
          <div className="landing-container">
            <div className="mx-auto max-w-3xl text-center reveal-rise">
              <h2 className="landing-display text-3xl font-bold text-[#111827] sm:text-4xl">How It Works</h2>
              <p className="mt-3 text-base text-[#6b7a8f] sm:text-lg">Your journey to success in three simple steps</p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {steps.map((step, index) => {
                const delayClass = index === 0 ? "" : index === 1 ? "reveal-delay-1" : "reveal-delay-2";

                return (
                  <article key={step.title} className={`reveal-rise ${delayClass} text-center`}>
                    <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white ${step.tone}`}>
                      {step.number}
                    </span>
                    <h3 className="landing-display mt-5 text-3xl font-bold text-[#1f2937]">{step.title}</h3>
                    <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[#526274] sm:text-base">{step.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="outcomes" className="bg-white py-16 sm:py-20">
          <div className="landing-container">
            <div className="mx-auto max-w-3xl text-center reveal-rise">
              <h2 className="landing-display text-3xl font-bold text-[#111827] sm:text-4xl">Proven Results</h2>
              <p className="mt-3 text-base text-[#6b7a8f] sm:text-lg">Real outcomes from students like you</p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {resultCards.map((result, index) => {
                const delayClass = index === 0 ? "" : index === 1 ? "reveal-delay-1" : "reveal-delay-2";

                return (
                  <article
                    key={result.label}
                    className={`reveal-rise ${delayClass} rounded-2xl border p-8 text-center ${result.tone}`}
                  >
                    <p className="landing-display text-5xl font-bold">{result.value}</p>
                    <p className="mt-3 text-sm font-semibold text-[#5d6c80] sm:text-base">{result.label}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="pb-16 pt-12 sm:pb-20 sm:pt-16">
          <div className="landing-container">
            <div className="reveal-rise rounded-4xl bg-[linear-gradient(135deg,#5146ff_0%,#4338ca_100%)] px-6 py-12 text-center text-white shadow-[0_24px_55px_rgba(79,70,229,0.35)] sm:px-8 sm:py-14">
              <h2 className="landing-display text-3xl font-bold sm:text-4xl lg:text-[3.2rem]">Ready to Start Your Career Journey?</h2>
              <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-[#e6e9ff] sm:text-lg">
                Join thousands of students who have successfully launched their careers with our AI-powered guidance.
              </p>
              <Link
                to="/getstarted"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#4338ca] transition hover:bg-[#eef1ff] sm:text-base"
              >
                Get Started For Free
                <FaArrowRight className="text-xs" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default LandingPage;
