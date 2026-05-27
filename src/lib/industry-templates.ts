// Industry-specific caption templates. Each industry has 8-10 templates that
// expand into rich, scenario-style prompts when a user taps a chip — they get
// dropped into the topic field on the Captions tab.
//
// The keys are stable (used in localStorage for "remember last industry")
// so don't rename them unless you also migrate stored values.

export type IndustryTemplate = {
  label: string;
  prompt: string;
};

export type Industry = {
  key: string;
  label: string;
  icon: string;
  templates: IndustryTemplate[];
};

export const INDUSTRIES: Industry[] = [
  {
    key: "restaurant",
    label: "Restaurant & Food",
    icon: "🍕",
    templates: [
      { label: "New menu item launch", prompt: "new menu item launch announcement" },
      { label: "Behind the scenes kitchen", prompt: "behind the scenes look inside the kitchen prepping a signature dish" },
      { label: "Chef special of the day", prompt: "chef special of the day featuring fresh ingredients" },
      { label: "Customer review spotlight", prompt: "spotlight on a glowing customer review with their photo" },
      { label: "Weekend specials", prompt: "weekend specials menu with limited time pricing" },
      { label: "Food delivery partnership", prompt: "announcement of new food delivery partnership" },
      { label: "Local sourcing story", prompt: "story of sourcing ingredients from a local farm" },
      { label: "Happy hour announcement", prompt: "happy hour announcement with drink and food deals" },
      { label: "Private event booking", prompt: "private dining and event booking now open" },
      { label: "Meet the chef", prompt: "meet the chef profile with their cooking philosophy" },
    ],
  },
  {
    key: "fitness",
    label: "Fitness & Gym",
    icon: "💪",
    templates: [
      { label: "Client transformation story", prompt: "client transformation story with before and after results" },
      { label: "Workout of the day", prompt: "workout of the day exercises and how to do them" },
      { label: "Nutrition tip", prompt: "quick nutrition tip for muscle recovery" },
      { label: "Gym membership promotion", prompt: "limited time gym membership promotion" },
      { label: "Personal training session", prompt: "what a personal training session looks like" },
      { label: "Fitness challenge", prompt: "30 day fitness challenge launch" },
      { label: "Form check demo", prompt: "proper form demo for a common lift" },
      { label: "Recovery routine", prompt: "post workout recovery routine and stretching" },
      { label: "Class schedule", prompt: "upcoming group fitness class schedule" },
      { label: "Trainer introduction", prompt: "introducing a new personal trainer joining the team" },
    ],
  },
  {
    key: "fashion",
    label: "Fashion & Beauty",
    icon: "👗",
    templates: [
      { label: "New collection drop", prompt: "new collection drop launch announcement" },
      { label: "Outfit of the day", prompt: "outfit of the day styling breakdown" },
      { label: "Styling tips", prompt: "5 styling tips to elevate a basic outfit" },
      { label: "Sale announcement", prompt: "site wide sale announcement with discount code" },
      { label: "Influencer collab", prompt: "influencer collaboration drop announcement" },
      { label: "Behind the scenes photoshoot", prompt: "behind the scenes from our latest photoshoot" },
      { label: "Trend forecast", prompt: "this season's biggest trend forecast" },
      { label: "Customer outfit feature", prompt: "featuring a customer wearing our pieces" },
      { label: "Sustainable materials", prompt: "story behind our sustainable fabrics" },
      { label: "Restock announcement", prompt: "popular sold out piece is back in stock" },
    ],
  },
  {
    key: "real_estate",
    label: "Real Estate",
    icon: "🏠",
    templates: [
      { label: "New listing", prompt: "new listing showcase with key features and price" },
      { label: "Just sold", prompt: "just sold announcement with sale story" },
      { label: "Open house", prompt: "upcoming open house event details" },
      { label: "Home buying tip", prompt: "first time home buyer tip" },
      { label: "Market update", prompt: "monthly local real estate market update" },
      { label: "Client testimonial", prompt: "happy buyer testimonial after closing" },
      { label: "Neighborhood spotlight", prompt: "neighborhood spotlight on a hidden gem area" },
      { label: "Home renovation reveal", prompt: "before and after home renovation reveal" },
      { label: "Investment property", prompt: "investment property opportunity breakdown" },
      { label: "Mortgage 101", prompt: "simple explanation of mortgage rates and terms" },
    ],
  },
  {
    key: "tech",
    label: "Tech & Startups",
    icon: "💻",
    templates: [
      { label: "Product launch", prompt: "new product feature launch and what it solves" },
      { label: "Founder story", prompt: "founder story behind why we built this" },
      { label: "Customer case study", prompt: "customer case study with measurable results" },
      { label: "Hiring announcement", prompt: "we're hiring for a key role announcement" },
      { label: "Funding milestone", prompt: "funding round announcement and what's next" },
      { label: "Behind the build", prompt: "behind the scenes of our latest build sprint" },
      { label: "Product tutorial", prompt: "quick tutorial showing a power user feature" },
      { label: "Team culture", prompt: "team culture and how we work" },
      { label: "Industry hot take", prompt: "contrarian hot take on a current industry trend" },
      { label: "Open beta launch", prompt: "open beta launch with how to join" },
    ],
  },
  {
    key: "education",
    label: "Education",
    icon: "🎓",
    templates: [
      { label: "Quick study tip", prompt: "quick study tip that actually works" },
      { label: "Course announcement", prompt: "new course or workshop launch" },
      { label: "Student success", prompt: "student success story with results" },
      { label: "Subject explainer", prompt: "explain a confusing concept in 60 seconds" },
      { label: "Back to school", prompt: "back to school tips and prep checklist" },
      { label: "Teacher feature", prompt: "spotlight a teacher and their teaching style" },
      { label: "Common mistake", prompt: "common mistake students make and how to fix it" },
      { label: "Resource roundup", prompt: "best free learning resources roundup" },
      { label: "Exam prep", prompt: "exam prep strategies for the final stretch" },
      { label: "Career path", prompt: "career path advice in this field" },
    ],
  },
  {
    key: "pets",
    label: "Pets",
    icon: "🐾",
    templates: [
      { label: "Adoptable pet of the week", prompt: "adoptable pet of the week and their story" },
      { label: "Training tip", prompt: "quick dog training tip every owner should know" },
      { label: "Pet care guide", prompt: "seasonal pet care guide" },
      { label: "New product or treat", prompt: "new pet product or treat launch" },
      { label: "Customer pet feature", prompt: "feature a customer's pet using our products" },
      { label: "Vet health tip", prompt: "vet approved pet health tip" },
      { label: "Cute pet moment", prompt: "share an irresistibly cute pet moment" },
      { label: "Grooming before and after", prompt: "dog grooming before and after reveal" },
      { label: "Rescue story", prompt: "rescue story of a pet finding their forever home" },
      { label: "Breed spotlight", prompt: "breed spotlight covering temperament and care" },
    ],
  },
  {
    key: "travel",
    label: "Travel",
    icon: "✈️",
    templates: [
      { label: "Destination highlight", prompt: "destination highlight with must-see spots" },
      { label: "Hidden gem", prompt: "hidden gem that most tourists miss" },
      { label: "Travel itinerary", prompt: "3-day travel itinerary for a city" },
      { label: "Packing tips", prompt: "essential packing tips for a long trip" },
      { label: "Local food tour", prompt: "local food tour with can't miss dishes" },
      { label: "Travel deal", prompt: "limited time travel deal announcement" },
      { label: "Budget travel hack", prompt: "budget travel hack that saved me hundreds" },
      { label: "Travel diary", prompt: "personal travel diary entry from today" },
      { label: "Solo travel tip", prompt: "solo travel safety and confidence tip" },
      { label: "Hotel or stay review", prompt: "honest review of a hotel or unique stay" },
    ],
  },
  {
    key: "music",
    label: "Music & Entertainment",
    icon: "🎵",
    templates: [
      { label: "New release teaser", prompt: "new song or album release teaser" },
      { label: "Tour announcement", prompt: "tour dates announcement with cities" },
      { label: "Behind the studio", prompt: "behind the scenes from the studio session" },
      { label: "Music video drop", prompt: "music video drop announcement" },
      { label: "Concert recap", prompt: "concert recap from last night's show" },
      { label: "Cover or remix", prompt: "cover or remix release tease" },
      { label: "Merch drop", prompt: "limited edition merch drop launch" },
      { label: "Collab announcement", prompt: "exciting artist collaboration announcement" },
      { label: "Throwback Thursday", prompt: "throwback to a memorable career moment" },
      { label: "Lyric tease", prompt: "lyric tease from upcoming release" },
    ],
  },
  {
    key: "health",
    label: "Health & Wellness",
    icon: "🏥",
    templates: [
      { label: "Wellness tip", prompt: "evidence-based wellness tip people overlook" },
      { label: "Patient story", prompt: "patient transformation story with their permission" },
      { label: "Service spotlight", prompt: "spotlight on a service or treatment we offer" },
      { label: "Mental health check-in", prompt: "gentle mental health check-in for followers" },
      { label: "Mindfulness practice", prompt: "5 minute mindfulness practice for stress" },
      { label: "Healthy recipe", prompt: "simple healthy recipe with macros" },
      { label: "Sleep hygiene tip", prompt: "sleep hygiene tip that changed my routine" },
      { label: "Practitioner introduction", prompt: "introduce a new practitioner joining the practice" },
      { label: "Myth bust", prompt: "bust a popular health myth with research" },
      { label: "Self-care routine", prompt: "Sunday self-care reset routine" },
    ],
  },
  {
    key: "finance",
    label: "Finance & Business",
    icon: "💰",
    templates: [
      { label: "Money saving tip", prompt: "money saving tip that actually works" },
      { label: "Investing basics", prompt: "investing basics for beginners" },
      { label: "Business milestone", prompt: "business milestone announcement with the story" },
      { label: "Side hustle idea", prompt: "side hustle idea anyone can start this weekend" },
      { label: "Tax tip", prompt: "tax tip people miss every year" },
      { label: "Client win", prompt: "client win story with measurable financial results" },
      { label: "Market update", prompt: "this week's market update in plain English" },
      { label: "Common mistake", prompt: "common financial mistake costing people money" },
      { label: "Budget breakdown", prompt: "real monthly budget breakdown for a salary" },
      { label: "Mindset shift", prompt: "money mindset shift that changed everything" },
    ],
  },
  {
    key: "ecommerce",
    label: "E-commerce & Retail",
    icon: "🛍️",
    templates: [
      { label: "New product launch", prompt: "new product launch with hero shot and features" },
      { label: "Bestseller spotlight", prompt: "bestseller spotlight and why customers love it" },
      { label: "Flash sale", prompt: "24 hour flash sale announcement with code" },
      { label: "Bundle deal", prompt: "bundle deal save more when you buy together" },
      { label: "Free shipping promo", prompt: "free shipping promotion with code" },
      { label: "Customer review feature", prompt: "real 5-star customer review feature" },
      { label: "Gift guide", prompt: "curated gift guide for a holiday or occasion" },
      { label: "Restock alert", prompt: "popular product back in stock alert" },
      { label: "How it's made", prompt: "how the product is designed and made" },
      { label: "Unboxing experience", prompt: "share the unboxing experience customers get" },
    ],
  },
];

export const INDUSTRY_KEYS = INDUSTRIES.map((i) => i.key);

export const DEFAULT_INDUSTRY_KEY = "restaurant";

export function getIndustryByKey(key: string | null | undefined): Industry {
  if (!key) return INDUSTRIES[0];
  const found = INDUSTRIES.find((i) => i.key === key);
  return found ?? INDUSTRIES[0];
}
