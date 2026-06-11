import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: {type: 'author'},
    }),
    defineField({
      name: 'mainImage',
      title: 'Main image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [{type: 'reference', to: {type: 'category'}}],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt (meta description)',
      type: 'text',
      rows: 3,
      description: '140–160 characters for SEO meta description. Falls back to body text if empty.',
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: 'isListicle',
      title: 'Listicle (ranked tools)',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'listicleItems',
      title: 'Listicle ranked items',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'name', title: 'Tool name', type: 'string'},
            {name: 'url', title: 'URL (optional)', type: 'url'},
          ],
          preview: {
            select: {title: 'name'},
          },
        },
      ],
      hidden: ({document}) => !document?.isListicle,
    }),
    defineField({
      name: 'faq',
      title: 'FAQ',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'question', title: 'Question', type: 'string'},
            {name: 'answer', title: 'Answer', type: 'text', rows: 3},
          ],
          preview: {
            select: {title: 'question'},
          },
        },
      ],
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'blockContent',
    }),
  ],

  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      media: 'mainImage',
    },
    prepare(selection) {
      const {author} = selection
      return {...selection, subtitle: author && `by ${author}`}
    },
  },
})
