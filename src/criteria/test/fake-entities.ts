import { v4 as uuidv4 } from 'uuid';
import { GetTypedCriteriaSchema } from '../types/schema.types.js';

export interface EntityBase {
  uuid: string;
  created_at: string;
}

export interface User extends EntityBase {
  email: string;
  username: string;
  addresses: Address[];
  permissions: Permission[];
  posts: Post[];
}

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'user',
  alias: 'users',
  fields: ['uuid', 'email', 'username', 'created_at'],
  identifier_field: 'uuid',
  relations: [
    {
      relation_alias: 'permissions',
      relation_type: 'many_to_many',
      target_source_name: 'permission',
      pivot_source_name: 'permission_user',
      relation_field: { pivot_field: 'permission_uuid', reference: 'uuid' },
      local_field: { pivot_field: 'user_uuid', reference: 'uuid' },
    },
    {
      relation_alias: 'addresses',
      relation_type: 'one_to_many',
      target_source_name: 'address',
      local_field: 'uuid',
      relation_field: 'user_uuid',
    },
    {
      relation_alias: 'posts',
      relation_type: 'one_to_many',
      target_source_name: 'post',
      relation_field: 'user_uuid',
      local_field: 'uuid',
    },
  ],
});
export type UserSchema = typeof UserSchema;

export interface Post extends EntityBase {
  title: string;
  body: string;
  publisher: User;
  comments: Comment[];
  categories: string[] | null;
  metadata?: {
    tags?: string[];
    views?: number;
    ratings?: number[];
    extra?: Record<string, any>;
  };
}

export const PostSchema = GetTypedCriteriaSchema({
  source_name: 'post',
  alias: 'posts',
  identifier_field: 'uuid',
  fields: [
    'uuid',
    'categories',
    'title',
    'body',
    'user_uuid',
    'created_at',
    'metadata',
  ],
  relations: [
    {
      relation_alias: 'comments',
      relation_type: 'one_to_many',
      target_source_name: 'post_comment',
      local_field: 'uuid',
      relation_field: 'post_uuid',
    },
    {
      relation_alias: 'publisher',
      relation_type: 'many_to_one',
      target_source_name: 'user',
      local_field: 'user_uuid',
      relation_field: 'uuid',
    },
  ],
});
export type PostSchema = typeof PostSchema;

export interface Comment extends EntityBase {
  comment_text: string;
  post: Post;
  user: User;
}

export const PostCommentSchema = GetTypedCriteriaSchema({
  source_name: 'post_comment',
  alias: 'comments',
  fields: ['uuid', 'comment_text', 'user_uuid', 'post_uuid', 'created_at'],
  identifier_field: 'uuid',
  relations: [
    {
      relation_alias: 'post',
      relation_type: 'many_to_one',
      target_source_name: 'post',
      local_field: 'post_uuid',
      relation_field: 'uuid',
    },
    {
      relation_alias: 'user',
      relation_type: 'many_to_one',
      target_source_name: 'user',
      local_field: 'user_uuid',
      relation_field: 'uuid',
    },
  ],
});
export type PostCommentSchema = typeof PostCommentSchema;
export interface Permission extends EntityBase {
  name: string;
  users?: User[];
}

export const PermissionSchema = GetTypedCriteriaSchema({
  source_name: 'permission',
  alias: 'permissions',
  fields: ['uuid', 'name', 'created_at'],
  identifier_field: 'uuid',
  relations: [
    {
      relation_alias: 'users',
      relation_type: 'many_to_many',
      target_source_name: 'user',
      local_field: { pivot_field: 'permission_uuid', reference: 'uuid' },
      relation_field: { pivot_field: 'user_uuid', reference: 'uuid' },
      pivot_source_name: 'permission_user',
    },
  ],
});
export type PermissionSchema = typeof PermissionSchema;
export interface Address extends EntityBase {
  direction: string;
  user: User;
}

export const AddressSchema = GetTypedCriteriaSchema({
  source_name: 'address',
  alias: 'addresses',
  fields: ['uuid', 'direction', 'user_uuid', 'created_at'],
  identifier_field: 'uuid',
  relations: [
    {
      relation_alias: 'user',
      relation_type: 'many_to_one',
      target_source_name: 'user',
      local_field: 'user_uuid',
      relation_field: 'uuid',
    },
  ],
});
export type AddressSchema = typeof AddressSchema;

export const EventType = {
  User: {
    Name: {
      Changed: 'User.Name.Changed',
    },
    Email: { Changed: 'User.Email.Changed' },
    Permission: {
      Changed: 'User.Permission.Changed',
    },
    SocialLinkAccount: {
      Added: 'User.SocialLinkAccount.Added',
      Removed: 'User.SocialLinkAccount.Removed',
      LoggedIn: 'User.SocialLinkAccount.LoggedIn',
    },
  },
  Post: {
    WasCreated: 'Post.WasCreated',
    WasModified: 'Post.WasModified',
    WasDisabled: 'Post.WasDisabled',
  },
} as const;

export type RecursiveObjectValueTypes<T> = {
  [U in keyof T]: T[U] extends string | number
    ? T[U]
    : T[U] extends (...args: never[]) => infer Return
      ? Return
      : T[U] extends object
        ? RecursiveObjectValueTypes<T[U]>
        : never;
}[keyof T];
export type EventType = RecursiveObjectValueTypes<typeof EventType>;

export interface DomainEvent<T extends { [key: string]: any }> {
  readonly id?: number;
  readonly event_type: EventType;
  readonly event_body: T;
  readonly event_version: number;
  readonly occurred_on: string;
  direct_tags?: string[] | null;
}

export const DomainEventsSchema = GetTypedCriteriaSchema({
  source_name: 'event',
  alias: 'events',
  identifier_field: 'id',
  fields: [
    'id',
    'event_type',
    'event_body',
    'event_version',
    'occurred_on',
    'direct_tags',
  ],
  relations: [],
});
export type DomainEventsSchema = typeof DomainEventsSchema;

export function generateFakeData() {
  let lastDate = new Date();
  const generateSequentialCreatedAt = (secondsDecrement = 1): string => {
    lastDate = new Date(lastDate.getTime() - secondsDecrement * 1000);
    return lastDate.toISOString();
  };

  const resetDateBase = () => {
    lastDate = new Date();
    lastDate.setDate(lastDate.getDate() - 200);
  };

  resetDateBase();

  const permissionsData: Permission[] = [];
  for (let i = 0; i < 5; i++) {
    permissionsData.push({
      uuid: uuidv4(),
      name: `permission_name_${i + 1}`,
      created_at: generateSequentialCreatedAt(10),
    });
  }

  const usersData: User[] = [];
  for (let i = 0; i < 8; i++) {
    const userPermissions: Permission[] = [];
    if (i === 0) {
      userPermissions.push(permissionsData[0]!, permissionsData[1]!);
    } else if (i === 1) {
      userPermissions.push(
        permissionsData[0]!,
        permissionsData[2]!,
        permissionsData[4]!,
      );
    } else {
      userPermissions.push(
        permissionsData[0]!,
        permissionsData[1]!,
        permissionsData[2]!,
        permissionsData[3]!,
      );
    }

    usersData.push({
      uuid: uuidv4(),
      email: `user${i + 1}@example.com`,
      username: `user_${i + 1}`,
      created_at: generateSequentialCreatedAt(20),
      addresses: [],
      posts: [],
      permissions: userPermissions,
    });
  }

  const addressesData: Address[] = [];
  usersData.forEach((user, index) => {
    const numAddresses = (index % 3) + 1;
    for (let i = 0; i < numAddresses; i++) {
      const address: Address = {
        uuid: uuidv4(),
        direction: `${(i + 1) * 100} Fake St, City ${index + 1}`,
        user: user,
        created_at: generateSequentialCreatedAt(5),
      };
      addressesData.push(address);
      user.addresses.push(address);
    }
  });

  const postsData: Post[] = [];
  for (let i = 0; i < 15; i++) {
    const publisherIndex = i % usersData.length;
    const post: Post = {
      uuid: uuidv4(),
      title: `Post Title ${i + 1}`,
      body: `This is the body of post ${i + 1}. Authored by ${usersData[publisherIndex]!.username}.`,
      publisher: usersData[publisherIndex]!,
      comments: [],
      categories: i % 3 === 0 ? ['tech', 'news', 'typeorm'] : null,
      created_at: generateSequentialCreatedAt(7),
      metadata:
        i % 4 === 0
          ? {
              tags: [`tag${i}`, `common_tag`],
              views: i * 100,
              ratings: i % 2 === 0 ? [3, 4, 5] : [1, 2],
              extra: { source: 'import', quality: 'high' },
            }
          : i % 4 === 1
            ? {
                tags: [],
                views: i * 50,
                extra: { source: 'manual' },
              }
            : i % 4 === 2
              ? {
                  tags: [`tag${i}`, `common_tag`, `post_specific_${i}`],
                  views: i * 100,
                  ratings: i % 2 === 0 ? [3, 4, 5] : [1, 2],
                  extra: { source: 'import', quality: 'high' },
                }
              : i % 3 === 1
                ? {
                    tags: [`another_tag${i}`, `common_tag`],
                    views: i * 50,
                    extra: { source: 'manual' },
                  }
                : { views: i * 20 },
    };
    postsData.push(post);
    usersData[publisherIndex]!.posts.push(post);
  }

  const allCommentsData: Comment[] = [];
  postsData.forEach((post, postIndex) => {
    for (let i = 0; i < 3; i++) {
      const mainCommentUserIndex = (postIndex + i) % usersData.length;
      const mainComment: Comment = {
        uuid: uuidv4(),
        comment_text: `Main comment ${i + 1} on "${post.title}" by ${usersData[mainCommentUserIndex]!.username}.`,
        post: post,
        user: usersData[mainCommentUserIndex]!,
        created_at: generateSequentialCreatedAt(3),
      };
      allCommentsData.push(mainComment);
      post.comments.push(mainComment);
    }
  });

  const domainEventsData: DomainEvent<any>[] = [];

  if (usersData[0]) {
    domainEventsData.push({
      event_type: EventType.User.Email.Changed,
      event_body: {
        user_uuid: usersData[0].uuid,
        old_email: 'old@example.com',
        new_email: usersData[0].email,
        reason: 'Account recovery',
        tags: ['security', 'user_update'],
        details: {
          ip_address: '192.168.1.100',
          userAgent: 'Test Agent/1.0',
        },
      },
      event_version: 1,
      occurred_on: generateSequentialCreatedAt(1),
      direct_tags: [],
    });
  }

  if (postsData[0]) {
    domainEventsData.push({
      event_type: EventType.Post.WasCreated,
      event_body: {
        post_uuid: postsData[0].uuid,
        title: postsData[0].title,
        author_uuid: postsData[0].publisher.uuid,
        categories: ['tech', 'news', 'typeorm'],
        status: 'published',
        content_length: postsData[0].body.length,
        metadata: postsData[0].metadata,
        tags: [],
      },
      event_version: 1,
      occurred_on: generateSequentialCreatedAt(1),
      direct_tags: ['post_event', 'creation', 'important'],
    });
  }
  if (postsData[1]) {
    domainEventsData.push({
      event_type: EventType.Post.WasModified,
      event_body: {
        post_uuid: postsData[1].uuid,
        changes: { title: 'New Title', body: 'Updated body content.' },
        editor_uuid: usersData[0]?.uuid || 'system',
        tags: ['update', 'content'],
        version_history: [
          { version: 1, changed_at: generateSequentialCreatedAt(10) },
          { version: 2, changed_at: generateSequentialCreatedAt(5) },
        ],
      },
      event_version: 2,
      occurred_on: generateSequentialCreatedAt(1),
      direct_tags: null,
    });
  }

  domainEventsData.push({
    event_type: EventType.User.Permission.Changed,
    event_body: {
      user_uuid: usersData[1]?.uuid || uuidv4(),
      added_permissions: ['read', 'write'],
      removed_permissions: ['delete_all'],
      actor_uuid: usersData[0]?.uuid || 'system',
    },
    event_version: 1,
    occurred_on: generateSequentialCreatedAt(1),
    direct_tags: ['permission', 'user_event'],
  });

  domainEventsData.push({
    event_type: EventType.Post.WasDisabled,
    event_body: {
      post_uuid: postsData[2]?.uuid || uuidv4(),
      reason: null,
      archived: true,
      disabled_by: usersData[0]?.uuid || 'system',
      flags: [10, 25, 30],
      tags: [],
    },
    event_version: 1,
    occurred_on: generateSequentialCreatedAt(1),
    direct_tags: ['status_change'],
  });

  return {
    fakePermissions: permissionsData,
    fakeUsers: usersData,
    fakeAddresses: addressesData,
    fakePosts: postsData,
    fakeComments: allCommentsData,
    fakeDomainEvents: domainEventsData,
  };
}
