import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us - Wings Associates',
  description: 'Learn about Wings Associates and our mission to transform HR management',
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">About Wings Associates</h1>
          <p className="text-xl text-gray-600 max-w-3xl">
            We&apos;re on a mission to transform how organizations manage their
            most valuable asset - their people.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Story</h2>
              <p className="text-gray-600 mb-4">
                Founded in 2020, Wings Associates was born from a simple observation:
                HR teams were spending too much time on administrative tasks
                and not enough time on what matters most - their people.
              </p>
              <p className="text-gray-600 mb-4">
                We set out to build a comprehensive HRMS that automates the
                mundane, provides actionable insights, and empowers HR
                professionals to focus on strategic initiatives.
              </p>
              <p className="text-gray-600">
                Today, Wings Associates serves hundreds of companies across various
                industries, helping them streamline their HR operations and
                build better workplaces.
              </p>
            </div>
            <div className="bg-gray-200 aspect-video rounded-xl flex items-center justify-center">
              <span className="text-gray-500">Company Image</span>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">{value.icon}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Leadership Team
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div key={index} className="text-center">
                <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-gray-500 text-sm">Photo</span>
                </div>
                <h3 className="font-semibold">{member.name}</h3>
                <p className="text-sm text-gray-600">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

const values = [
  {
    icon: '💡',
    title: 'Innovation',
    description:
      'We continuously push boundaries to deliver cutting-edge HR solutions.',
  },
  {
    icon: '🤝',
    title: 'Customer First',
    description:
      'Our customers success is our success. We go above and beyond to help them.',
  },
  {
    icon: '🎯',
    title: 'Simplicity',
    description:
      'We believe powerful software should be easy to use and understand.',
  },
];

const team = [
  { name: 'John Smith', role: 'CEO & Co-Founder' },
  { name: 'Sarah Johnson', role: 'CTO & Co-Founder' },
  { name: 'Michael Chen', role: 'VP of Engineering' },
  { name: 'Emily Davis', role: 'VP of Product' },
];
