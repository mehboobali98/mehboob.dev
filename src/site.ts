// Contact details, in one place.
//
// The email was hardcoded in seven spots across six files, and the GitHub URL in nine.
// That is the shape of a bug waiting to happen: change the address, miss the copy in
// llms.txt or the JSON-LD, and the site quietly advertises a dead inbox to exactly the
// people it is trying to reach. Anything that appears in more than one template belongs
// here.
export const contact = {
  email: 'imehboobali@outlook.com',
  github: 'https://github.com/mehboobali98',
  linkedin: 'https://www.linkedin.com/in/mehboobali98',
} as const;

// Handy for the places that print the address rather than link it.
export const mailto = `mailto:${contact.email}`;
