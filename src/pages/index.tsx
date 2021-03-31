import { GetStaticProps } from 'next';

import { FiCalendar, FiUser } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import ptBR from 'date-fns/locale/pt-BR';

import Link from 'next/link';
import { format } from 'date-fns';
import { useState } from 'react';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: Promise<void>;
}

export default function Home({
  postsPagination,
  preview,
}: HomeProps): JSX.Element {
  const [posts, setPosts] = useState(postsPagination.results);

  function handleLoadMorePosts(): void {
    fetch(postsPagination.next_page)
      .then(response => response.json())
      .then(data => {
        const newPosts: Post[] = data.results.map((post: Post) => {
          return {
            uid: post.uid,
            first_publication_date: format(
              new Date(post.first_publication_date),
              'dd MMM yyyy'
            ),
            data: {
              title: post.data.title,
              subtitle: post.data.subtitle,
              author: post.data.author,
            },
          };
        });

        setPosts([...posts, ...newPosts]);
      });
  }

  return (
    <>
      <main className={commonStyles.container}>
        <div className={styles.content}>
          <img src="/logo.svg" alt="logo" />
          {posts.map(post => (
            <div className={styles.post} key={post.uid}>
              <Link href={`/post/${post.uid}`}>
                <a>
                  <h1>{post.data.title}</h1>
                  <h2>{post.data.subtitle}</h2>
                  <div>
                    <time>
                      <FiCalendar />
                      {format(
                        new Date(post.first_publication_date),
                        'dd MMM yyyy',
                        {
                          locale: ptBR,
                        }
                      )}
                    </time>
                    <span>
                      <FiUser />
                      {post.data.author}
                    </span>
                  </div>
                </a>
              </Link>
            </div>
          ))}
          {postsPagination.next_page && (
            <button type="button" onClick={() => handleLoadMorePosts()}>
              Carregar mais posts
            </button>
          )}

          {preview && (
            <aside className={styles.previewButton}>
              <Link href="/api/exit-preview">
                <a>Sair do modo Preview</a>
              </Link>
            </aside>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();

  const { next_page, results } = await prismic.query(
    Prismic.predicates.at('document.type', 'posts'),
    {
      fetch: ['post.title', 'post.subtitle', 'post.author'],
      pageSize: 3,
      ref: previewData?.ref ?? null,
    }
  );

  const posts = results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  return {
    props: {
      postsPagination: {
        next_page,
        results: posts,
      },
      preview,
    },
  };
};
