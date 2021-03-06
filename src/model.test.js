/* eslint-env jest */
const Model = require('./model')
const Schema = require('./schema')
const Document = require('./document')
const Query = require('./query')
const MemStore = require('../src/mem-store')

const now = new Date()

describe('single source', async () => {
	test('get()', async () => {
		const storage = new MemStore({
			posts: [
				{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now
				},
				{
					id: 2,
					title: 'Post 2',
					content: 'This is the second post',
					dateCreated: now
				}
			]
		})
		const PostsSchema = new Schema(storage, 'posts', 'id')

		const Post = Model
			.create()
			.addSource('post', PostsSchema)
			.map(({ post }) => ({
				title: post.title,
				content: post.content,
				date: { created: post.dateCreated }
			}))
			.addQuery('default',
				Query
					.create()
					.input(id => ({ post: { id }}))
					.populate('post', ({ post }) => ({ id: post.id }))
			)

		const doc = await Post.get(1)
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toEqual({
			title: 'Post 1',
			content: 'This is the first post',
			date: { created: now }
		})
	})

	test('mutate()', async () => {
		const storage = new MemStore({
			posts: [
				{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now
				},
				{
					id: 2,
					title: 'Post 2',
					content: 'This is the second post',
					dateCreated: now
				}
			]
		})
		const PostsSchema = new Schema(storage, 'posts', 'id')

		const Post = Model
			.create()
			.addSource('post', PostsSchema)
			.map(({ post }) => ({
				title: post.title,
				content: post.content,
				date: { created: post.dateCreated }
			}))
			.addMutation('updateTitle', title => ([
				{ source: 'post', data: { title } }
			]))
			.addMutation('updateAll', data => ([
				{ source: 'post', data: { title: data.title, content: data.content, dateCreated: data.date.created } }
			]))
			.addQuery('default',
				Query
					.create()
					.input(id => ({ post: { id }}))
					.populate('post', ({ post }) => ({ id: post.id }))
			)

		let doc = await Post.get(1)
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toEqual({
			title: 'Post 1',
			content: 'This is the first post',
			date: { created: now }
		})

		doc = await doc.mutate('updateTitle', 'Updated Title')
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toEqual({
			title: 'Updated Title',
			content: 'This is the first post',
			date: { created: now }
		})

		const now2 = new Date()
		doc = await doc.mutate('updateAll', {
			title: 'Updated Again',
			content: 'Look at me!',
			date: { created: now2 }
		})
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toEqual({
			title: 'Updated Again',
			content: 'Look at me!',
			date: { created: now2 }
		})
	})

	test('del()', async () => {
		const storage = new MemStore({
			posts: [
				{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now
				},
				{
					id: 2,
					title: 'Post 2',
					content: 'This is the second post',
					dateCreated: now
				}
			]
		})
		const PostsSchema = new Schema(storage, 'posts', 'id')

		const Post = Model
			.create()
			.addSource('post', PostsSchema)
			.map(({ post }) => ({
				title: post.title,
				content: post.content,
				date: { created: post.dateCreated }
			}))
			.bindSources(['post'])
			.addQuery('default',
				Query
					.create()
					.input(id => ({ post: { id }}))
					.populate('post', ({ post }) => ({ id: post.id }))
			)

		let doc = await Post.get(1)
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toEqual({
			title: 'Post 1',
			content: 'This is the first post',
			date: { created: now }
		})

		let deleted = await Post.del(1)
		expect(deleted).toEqual([
			{
				source: 'post',
				deleted: [{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now
				}]
			}
		])
	})

	test('createNew()', async () => {
		const storage = new MemStore({
			posts: [
				{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now
				},
				{
					id: 2,
					title: 'Post 2',
					content: 'This is the second post',
					dateCreated: now
				}
			]
		})
		const PostsSchema = new Schema(storage, 'posts', 'id')

		const Post = Model
			.create()
			.addSource('post', PostsSchema)
			.map(({ post }) => ({
				title: post.title,
				content: post.content,
				date: { created: post.dateCreated }
			}))
			.addQuery('default',
				Query
					.create()
					.input(
						id => ({ post: { id }}),
						({ post }) => post.id
					)
					.populate('post', ({ post }) => ({ id: post.id }))
			)
			.addInitializer('post', data => ({
				title: data.title,
				content: data.content,
				dateCreated: data.dateCreated || now
			}))

		let doc = await Post.get(1)
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toEqual({
			title: 'Post 1',
			content: 'This is the first post',
			date: { created: now }
		})

		doc = await Post.create({
			title: 'New Post',
			content: 'New post content'
		})
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toHaveProperty('title', 'New Post')
		expect(doc.data).toHaveProperty('content', 'New post content')
		expect(doc.data).toHaveProperty('date.created', now)
	})

	test('query()', async () => {
		const storage = new MemStore({
			posts: [
				{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now
				},
				{
					id: 2,
					title: 'Post 2',
					content: 'This is the second post',
					dateCreated: now
				}
			]
		})
		const PostsSchema = new Schema(storage, 'posts', 'id')

		const Post = Model
			.create()
			.addSource('post', PostsSchema)
			.map(({ post }) => ({
				title: post.title,
				content: post.content,
				date: { created: post.dateCreated }
			}))
			.addQuery('default',
				Query
					.create()
					.input(id => ({ post: { id } }))
					.populate('post', ({ post }) => ({ id: post.id }))
			)

		const doc = await Post.get(1)
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toEqual({
			title: 'Post 1',
			content: 'This is the first post',
			date: { created: now }
		})
	})
})

describe('multiple sources', async () => {
	test('get()', async () => {
		const storage = new MemStore({
			users: [
				{
					id: 1,
					username: 'jdoe',
					name: { first: 'John', last: 'Doe' },
					dateCreated: now
				},
				{
					id: 2,
					username: 'twaits',
					name: { first: 'Tom', last: 'Waits' },
					dateCreated: now
				}
			],
			posts: [
				{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now,
					author: 1
				},
				{
					id: 2,
					title: 'Post 2',
					content: 'This is the second post',
					dateCreated: now,
					author: 1
				}
			]
		})

		const PostsSchema = new Schema(storage, 'posts', 'id')
		const UsersSchema = new Schema(storage, 'users', 'id')

		const Post = Model
			.create()
			.addSource('post', PostsSchema)
			.addSource('author', UsersSchema)
			.map(({ post, author }) => ({
				title: post.title,
				content: post.content,
				date: { created: post.dateCreated },
				author: {
					username: author.username,
					name: author.name
				}
			}))
			.addQuery('default',
				Query
					.create()
					.input(id => ({ post: { id }}))
					.populate('post', ({ post }) => ({ id: post.id }))
					.populate('author', ({ post }) => ({ id: post.author }))
			)
			
		const doc = await Post.get(1)
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toEqual({
			title: 'Post 1',
			content: 'This is the first post',
			date: { created: now },
			author: {
				username: 'jdoe',
				name: { first: 'John', last: 'Doe' }
			}
		})
	})

	test('mutate()', async () => {
		const storage = new MemStore({
			users: [
				{
					id: 1,
					username: 'jdoe',
					name: { first: 'John', last: 'Doe' },
					dateCreated: now
				},
				{
					id: 2,
					username: 'twaits',
					name: { first: 'Tom', last: 'Waits' },
					dateCreated: now
				}
			],
			posts: [
				{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now,
					author: 1
				},
				{
					id: 2,
					title: 'Post 2',
					content: 'This is the second post',
					dateCreated: now,
					author: 1
				}
			]
		})

		const PostsSchema = new Schema(storage, 'posts', 'id')
		const UsersSchema = new Schema(storage, 'users', 'id')

		const Post = Model
			.create()
			.addSource('post', PostsSchema)
			.addSource('author', UsersSchema)
			.map(({ post, author }) => ({
				title: post.title,
				content: post.content,
				date: { created: post.dateCreated },
				author: {
					username: author.username,
					name: author.name
				}
			}))
			.addQuery('default',
				Query
					.create()
					.input(id => ({ post: { id }}))
					.populate('post', ({ post }) => ({ id: post.id }))
					.populate('author', ({ post }) => ({ id: post.author }))
			)
			.addMutation('updateAuthor', id => ([
				{ source: 'post', data: { author: id } }
			]))
			
		let doc = await Post.get(1)
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toEqual({
			title: 'Post 1',
			content: 'This is the first post',
			date: { created: now },
			author: {
				username: 'jdoe',
				name: { first: 'John', last: 'Doe' }
			}
		})

		doc = await doc.mutate('updateAuthor', 2)
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toEqual({
			title: 'Post 1',
			content: 'This is the first post',
			date: { created: now },
			author: {
				username: 'twaits',
				name: { first: 'Tom', last: 'Waits' }
			}
		})
	})

	test('del()', async () => {
		const storage = new MemStore({
			users: [
				{
					id: 1,
					username: 'jdoe',
					name: { first: 'John', last: 'Doe' },
					dateCreated: now
				},
				{
					id: 2,
					username: 'twaits',
					name: { first: 'Tom', last: 'Waits' },
					dateCreated: now
				}
			],
			posts: [
				{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now,
					author: 1
				},
				{
					id: 2,
					title: 'Post 2',
					content: 'This is the second post',
					dateCreated: now,
					author: 1
				}
			]
		})

		const PostsSchema = new Schema(storage, 'posts', 'id')
		const UsersSchema = new Schema(storage, 'users', 'id')

		const Post = Model
			.create()
			.addSource('post', PostsSchema)
			.addSource('author', UsersSchema)
			.map(({ post, author }) => ({
				title: post.title,
				content: post.content,
				date: { created: post.dateCreated },
				author: {
					username: author.username,
					name: author.name
				}
			}))
			.addQuery('default',
				Query
					.create()
					.input(id => ({ post: { id }}))
					.populate('post', ({ post }) => ({ id: post.id }))
					.populate('author', ({ post }) => ({ id: post.author }))
			)
			.bindSources(['post'])
			
		const doc = await Post.get(1)
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toEqual({
			title: 'Post 1',
			content: 'This is the first post',
			date: { created: now },
			author: {
				username: 'jdoe',
				name: { first: 'John', last: 'Doe' }
			}
		})

		const deleted = await doc.del()
		expect(deleted).toEqual([
			{
				source: 'post',
				deleted: [{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now,
					author: 1
				}]
			}
		])
	})

	test('createNew()', async () => {
		const storage = new MemStore({
			users: [
				{
					id: 1,
					username: 'jdoe',
					name: { first: 'John', last: 'Doe' },
					dateCreated: now
				},
				{
					id: 2,
					username: 'twaits',
					name: { first: 'Tom', last: 'Waits' },
					dateCreated: now
				}
			],
			posts: [
				{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now,
					author: 1
				},
				{
					id: 2,
					title: 'Post 2',
					content: 'This is the second post',
					dateCreated: now,
					author: 1
				}
			]
		})

		const PostsSchema = new Schema(storage, 'posts', 'id')
		const UsersSchema = new Schema(storage, 'users', 'id')

		const Post = Model
			.create()
			.addSource('post', PostsSchema)
			.addSource('author', UsersSchema)
			.map(({ post, author }) => ({
				title: post.title,
				content: post.content,
				date: { created: post.dateCreated },
				author: {
					username: author.username,
					name: author.name
				}
			}))
			.addQuery('default',
				Query
					.create()
					.input(
						id => ({ post: { id }}),
						({ post }) => post.id
					)
					.populate('post', ({ post }) => ({ id: post.id }))
					.populate('author', ({ post }) => ({ id: post.author }))
			)
			.addInitializer('post', data => ({
				title: data.title,
				content: data.content,
				dateCreated: data.dateCreated || now,
				author: data.author
			}))
			
		let doc = await Post.get(1)
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toEqual({
			title: 'Post 1',
			content: 'This is the first post',
			date: { created: now },
			author: {
				username: 'jdoe',
				name: { first: 'John', last: 'Doe' }
			}
		})

		doc = await Post.create({
			title: 'New Post',
			content: 'New post content',
			author: 2
		})
		expect(doc.data).toHaveProperty('title', 'New Post')
		expect(doc.data).toHaveProperty('content', 'New post content')
		expect(doc.data).toHaveProperty('date.created', now)
		expect(doc.data).toHaveProperty('author', {
			username: 'twaits',
			name: { first: 'Tom', last: 'Waits' }
		})
	})

	test('query()', async () => {
		const storage = new MemStore({
			users: [
				{
					id: 1,
					username: 'jdoe',
					name: { first: 'John', last: 'Doe' },
					dateCreated: now
				},
				{
					id: 2,
					username: 'twaits',
					name: { first: 'Tom', last: 'Waits' },
					dateCreated: now
				}
			],
			posts: [
				{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now,
					author: 1
				},
				{
					id: 2,
					title: 'Post 2',
					content: 'This is the second post',
					dateCreated: now,
					author: 1
				}
			]
		})

		const PostsSchema = new Schema(storage, 'posts', 'id')
		const UsersSchema = new Schema(storage, 'users', 'id')

		const Post = Model
			.create()
			.addSource('post', PostsSchema)
			.addSource('posts', [PostsSchema])
			.addSource('author', UsersSchema)
			.map(({ post, author }) => ({
				title: post.title,
				content: post.content,
				date: { created: post.dateCreated },
				author: {
					username: author.username,
					name: author.name
				}
			}))
			.addQuery('default',
				Query
					.create()
					.input(id => ({ post: { id }}))
					.populate('post', ({ post }) => ({ id: post.id }))
					.populate('author', ({ post }) => ({ id: post.author }))
			)
			.addQuery('byAuthor',
				Query
					.create(true)
					.input(id => ({ author: { id } }))
					.populate('posts', ({ author }) => ({ author: author.id }))
					.populate('author', ({ author }) => ({ id: author.id }))
					.map(({ author, posts }) => posts.map(post => ({ post, author })))
			)
			
		const docs = await Post.query('byAuthor', 1)
		expect(docs).toHaveLength(2)
		expect(docs[0].data).toEqual({
			title: 'Post 1',
			content: 'This is the first post',
			date: { created: now },
			author: {
				username: 'jdoe',
				name: { first: 'John', last: 'Doe' }
			}
		})
		expect(docs[1].data).toEqual({
			title: 'Post 2',
			content: 'This is the second post',
			date: { created: now },
			author: {
				username: 'jdoe',
				name: { first: 'John', last: 'Doe' }
			}
		})
	})
})

describe('array source', async () => {
	test('get()', async () => {
		const storage = new MemStore({
			posts: [
				{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now
				}
			],
			tags: [
				{ id: 1, title: 'Sevr', dateCreated: now },
				{ id: 2, title: 'MongoDB', dateCreated: now },
				{ id: 3, title: 'React', dateCreated: now }
			],
			postTags: [
				{ id: 1, post: 1, tag: 1 },
				{ id: 1, post: 1, tag: 2 },
				{ id: 1, post: 2, tag: 3 }
			]
		})
		const PostsSchema = new Schema(storage, 'posts', 'id')
		const TagsSchema = new Schema(storage, 'tags', 'id')
		const PostTagsSchema = new Schema(storage, 'postTags', 'id')

		const Post = Model
			.create()
			.addSource('post', PostsSchema,)
			.addSource('tagLinks', [PostTagsSchema])
			.addSource('tags', TagsSchema)
			.map(({ post, tags }) => ({
				title: post.title,
				content: post.content,
				date: { created: post.dateCreated },
				tags: tags.map(tag => tag.title)
			}))
			.addQuery('default',
				Query
					.create()
					.input(id => ({ post: { id }}))
					.populate('post', ({ post }) => ({ id: post.id }))
					.populate('tagLinks', ({ post }) => ({ post: post.id }))
					.populate('tags', ({ tagLinks }) => tagLinks.map(link => ({ id: link.tag })))
			)

		const doc = await Post.get(1)
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toEqual({
			title: 'Post 1',
			content: 'This is the first post',
			date: { created: now },
			tags: ['Sevr', 'MongoDB']
		})
	})

	test('mutate()', async () => {
		const storage = new MemStore({
			posts: [
				{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now
				}
			],
			tags: [
				{ id: 1, title: 'Sevr', dateCreated: now },
				{ id: 2, title: 'MongoDB', dateCreated: now },
				{ id: 3, title: 'React', dateCreated: now }
			],
			postTags: [
				{ id: 1, post: 1, tag: 1 },
				{ id: 1, post: 1, tag: 2 },
				{ id: 1, post: 2, tag: 3 }
			]
		})
		const PostsSchema = new Schema(storage, 'posts', 'id')
		const TagsSchema = new Schema(storage, 'tags', 'id')
		const PostTagsSchema = new Schema(storage, 'postTags', 'id')

		const Post = Model
			.create()
			.addSource('post', PostsSchema,)
			.addSource('tagLinks', [PostTagsSchema])
			.addSource('tags', TagsSchema)
			.map(({ post, tags }) => ({
				title: post.title,
				content: post.content,
				date: { created: post.dateCreated },
				tags: tags.map(tag => tag.title)
			}))
			.addQuery('default',
				Query
					.create()
					.input(id => ({ post: { id }}))
					.populate('post', ({ post }) => ({ id: post.id }))
					.populate('tagLinks', ({ post }) => ({ post: post.id }))
					.populate('tags', ({ tagLinks }) => tagLinks.map(link => ({ id: link.tag })))
			)
			.addMutation('pushTag', (id, { post }) => ([
				{ source: 'tagLinks', data: { post: post.id, tag: id }, operation: 'create' }
			]))

		let doc = await Post.get(1)
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toEqual({
			title: 'Post 1',
			content: 'This is the first post',
			date: { created: now },
			tags: ['Sevr', 'MongoDB']
		})

		doc = await doc.mutate('pushTag', 3)
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toEqual({
			title: 'Post 1',
			content: 'This is the first post',
			date: { created: now },
			tags: ['Sevr', 'MongoDB', 'React']
		})
	})

	test('del()', async () => {
		const storage = new MemStore({
			posts: [
				{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now
				}
			],
			tags: [
				{ id: 1, title: 'Sevr', dateCreated: now },
				{ id: 2, title: 'MongoDB', dateCreated: now },
				{ id: 3, title: 'React', dateCreated: now }
			],
			postTags: [
				{ id: 1, post: 1, tag: 1 },
				{ id: 1, post: 1, tag: 2 },
				{ id: 1, post: 2, tag: 3 }
			]
		})
		const PostsSchema = new Schema(storage, 'posts', 'id')
		const TagsSchema = new Schema(storage, 'tags', 'id')
		const PostTagsSchema = new Schema(storage, 'postTags', 'id')

		const Post = Model
			.create()
			.addBoundSource('post', PostsSchema,)
			.addBoundSource('tagLinks', [PostTagsSchema])
			.addSource('tags', TagsSchema)
			.map(({ post, tags }) => ({
				title: post.title,
				content: post.content,
				date: { created: post.dateCreated },
				tags: tags.map(tag => tag.title)
			}))
			.addQuery('default',
				Query
					.create()
					.input(id => ({ post: { id }}))
					.populate('post', ({ post }) => ({ id: post.id }))
					.populate('tagLinks', ({ post }) => ({ post: post.id }))
					.populate('tags', ({ tagLinks }) => tagLinks.map(link => ({ id: link.tag })))
			)

		const doc = await Post.get(1)
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toEqual({
			title: 'Post 1',
			content: 'This is the first post',
			date: { created: now },
			tags: ['Sevr', 'MongoDB']
		})

		const deleted = await doc.del()
		expect(deleted).toEqual([
			{
				source: 'post',
				deleted: [{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now
				}]
			},
			{
				source: 'tagLinks',
				deleted: [
					{ id: 1, post: 1, tag: 1 },
					{ id: 1, post: 1, tag: 2 }
				]
			}
		])
	})

	test('createNew()', async () => {
		const storage = new MemStore({
			posts: [
				{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now
				}
			],
			tags: [
				{ id: 1, title: 'Sevr', dateCreated: now },
				{ id: 2, title: 'MongoDB', dateCreated: now },
				{ id: 3, title: 'React', dateCreated: now }
			],
			postTags: [
				{ id: 1, post: 1, tag: 1 },
				{ id: 1, post: 1, tag: 2 },
				{ id: 1, post: 2, tag: 3 }
			]
		})
		const PostsSchema = new Schema(storage, 'posts', 'id')
		const TagsSchema = new Schema(storage, 'tags', 'id')
		const PostTagsSchema = new Schema(storage, 'postTags', 'id')

		const Post = Model
			.create()
			.addSource('post', PostsSchema,)
			.addSource('tagLinks', [PostTagsSchema])
			.addSource('tags', TagsSchema)
			.map(({ post, tags }) => ({
				title: post.title,
				content: post.content,
				date: { created: post.dateCreated },
				tags: tags.map(tag => tag.title)
			}))
			.addQuery('default',
				Query
					.create()
					.input(
						input => ({ post: { id: input }}),
						({ post }) => post.id
					)
					.populate('post', ({ post }) => ({ id: post.id }))
					.populate('tagLinks', ({ post }) => ({ post: post.id }))
					.populate('tags', ({ tagLinks }) => tagLinks.map(link => ({ id: link.tag })))
			)
			.addInitializer('post', data => ({
				title: data.title,
				content: data.content,
				dateCreated: data.dateCreated || now
			}))
			.addInitializer('tagLinks', (data, sources) => data.tags.map(tag => ({ post: sources.post.id, tag })))

		let doc = await Post.get(1)
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toEqual({
			title: 'Post 1',
			content: 'This is the first post',
			date: { created: now },
			tags: ['Sevr', 'MongoDB']
		})

		doc = await Post.create({
			title: 'New Post',
			content: 'New post content',
			tags: [2, 3]
		})
		expect(doc instanceof Document).toBeTruthy()
		expect(doc.data).toHaveProperty('title', 'New Post')
		expect(doc.data).toHaveProperty('content', 'New post content')
		expect(doc.data).toHaveProperty('date.created', now)
		expect(doc.data).toHaveProperty('tags', ['MongoDB', 'React'])
	})

	test('query()', async () => {
		const storage = new MemStore({
			posts: [
				{
					id: 1,
					title: 'Post 1',
					content: 'This is the first post',
					dateCreated: now
				},
				{
					id: 2,
					title: 'Post 2',
					content: 'This is the second post',
					dateCreated: now
				}
			],
			tags: [
				{ id: 1, title: 'Sevr', dateCreated: now },
				{ id: 2, title: 'MongoDB', dateCreated: now },
				{ id: 3, title: 'React', dateCreated: now }
			],
			postTags: [
				{ id: 1, post: 1, tag: 1 },
				{ id: 1, post: 1, tag: 2 },
				{ id: 1, post: 2, tag: 1 }
			]
		})
		const PostsSchema = new Schema(storage, 'posts', 'id')
		const TagsSchema = new Schema(storage, 'tags', 'id')
		const PostTagsSchema = new Schema(storage, 'postTags', 'id')

		const Post = Model
			.create()
			.addSource('post', PostsSchema)
			.addSource('posts', PostsSchema)
			.addSource('tagLinks', [PostTagsSchema])
			.addSource('postLinks', [PostTagsSchema])
			.addSource('tags', TagsSchema)
			.map(({ post, tags }) => ({
				title: post.title,
				content: post.content,
				date: { created: post.dateCreated },
				tags: tags.map(tag => tag.title)
			}))
			.addQuery('default',
				Query
					.create()
					.input(id => ({ post: { id }}))
					.populate('post', ({ post }) => ({ id: post.id }))
					.populate('tagLinks', ({ post }) => ({ post: post.id }))
					.populate('tags', ({ tagLinks }) => tagLinks.map(link => ({ id: link.tag })))
			)
			.addQuery('withTag',
				Query
					.create(true)
					.input(tagId => ({ tag: { id: tagId } }))
					.populate('tagLinks', ({ tag }) => ({ tag: tag.id }))
					.populate('posts', ({ tagLinks }) => tagLinks.map(link => ({ id: link.post })))
					.populate('postLinks', ({ posts }) => posts.map(post => {
						return { post: post.id }
					}))
					.populate('tags', ({ postLinks }) => {
						return postLinks.reduce((acc, links) => {
							return acc.concat(
								links.map(link => ({ id: link.tag }))
							)
						}, [])
					})
					.map(({ posts, postLinks, tags }) => {
						return posts.map((post, p) => {
							return {
								post,
								tags: postLinks[p].map(link => tags.find(tag => tag.id === link.tag))
							}
						})
					})
			)

		const docs = await Post.query('withTag', 1)
		expect(docs).toHaveLength(2)
		expect(docs[0].data).toEqual({
			title: 'Post 1',
			content: 'This is the first post',
			date: { created: now },
			tags: ['Sevr', 'MongoDB']
		})
		expect(docs[1].data).toEqual({
			title: 'Post 2',
			content: 'This is the second post',
			date: { created: now },
			tags: ['Sevr']
		})
	})
})