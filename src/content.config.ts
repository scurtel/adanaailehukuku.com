import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const frontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  slug: z.string().optional(),
  date: z.coerce.date().optional(),
  author: z.string().optional(),
  reviewer: z.string().optional(),
  category: z.string().optional(),
  focusKeyword: z.string().optional(),
  practiceArea: z.union([z.array(z.string()), z.string()]).optional(),
  location: z.string().optional(),
  secondaryKeywords: z.union([z.array(z.string()), z.string()]).optional(),
});

export const collections = {
  articles: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './content/articles' }),
    schema: frontmatterSchema,
  }),
  pages: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './content/pages' }),
    schema: frontmatterSchema,
  }),
};
