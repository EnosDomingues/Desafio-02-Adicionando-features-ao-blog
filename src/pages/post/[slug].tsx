/* eslint-disable react/no-danger */
import { GetStaticPaths, GetStaticProps } from 'next';
import { format } from 'date-fns';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import ptBR from 'date-fns/locale/pt-BR';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useMemo } from 'react';
import Header from '../../components/Header';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: Promise<void>;
  before: {
    uid: string;
    title: string;
  };
  after: {
    uid: string;
    title: string;
  };
}

export default function Post({
  post,
  preview,
  after,
  before,
}: PostProps): JSX.Element {
  const updatedDateTime = useMemo(() => {
    return format(
      new Date(post.last_publication_date),
      "'* editado em 'dd MMM yyyy', às ' HH:mm ",
      {
        locale: ptBR,
      }
    );
  }, [post.last_publication_date]);
  const router = useRouter();

  const readTime = post?.data.content.reduce((sumTotal, content) => {
    const textTime = RichText.asText(content.body).split(' ').length;
    return Math.ceil(sumTotal + textTime / 200);
  }, 0);

  return (
    <>
      {router.isFallback ? (
        <h1 className={styles.isLoading}>Carregando...</h1>
      ) : (
        <>
          <Header />
          <div className={styles.banner}>
            <img src={post.data.banner.url} alt="banner" />
          </div>
          <main className={commonStyles.container}>
            <div className={styles.postContent}>
              <h1>{post.data.title}</h1>
              <div className={styles.icons}>
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
                <span>
                  <FiClock />
                  {readTime} min
                  {/*                   */}
                </span>
              </div>
              <span className={styles.editedDate}>
                <span>{updatedDateTime}</span>
              </span>
              {post.data.content.map(({ heading, body }) => (
                <div key={heading} className={styles.postContent}>
                  <h2>{heading}</h2>
                  <div
                    className={styles.bodyWrapper}
                    dangerouslySetInnerHTML={{ __html: RichText.asHtml(body) }}
                  />
                </div>
              ))}
              <hr />
              <div className={styles.pagination}>
                {before?.title && (
                  <div>
                    <h1>{before?.title}</h1>
                    <Link href={`/post/${before?.uid}`}>
                      <a>Post anterior</a>
                    </Link>
                  </div>
                )}
                {after?.title && (
                  <div>
                    <h1>{after?.title}</h1>
                    <Link href={`/post/${after?.uid}`}>
                      <a>Próximo post</a>
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <section
              ref={elem => {
                if (!elem) {
                  return;
                }

                const scriptElem = document.createElement('script');
                scriptElem.src = 'https://utteranc.es/client.js';
                scriptElem.async = true;
                scriptElem.crossOrigin = 'anonymous';
                scriptElem.setAttribute(
                  'repo',
                  'EnosDomingues/Desafio-02-Adicionando-features-ao-blog'
                );
                scriptElem.setAttribute('issue-term', 'pathname');
                scriptElem.setAttribute('label', 'blog-comment');
                scriptElem.setAttribute('theme', 'github-dark');
                elem.appendChild(scriptElem);
              }}
            />
            {preview && (
              <aside className={commonStyles.previewButton}>
                <Link href="/api/exit-preview">
                  <a>Sair do modo Preview</a>
                </Link>
              </aside>
            )}
          </main>
        </>
      )}
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const { results } = await prismic.query(
    Prismic.predicates.at('document.type', 'posts'),
    {
      pageSize: 2,
    }
  );

  const hotPosts = results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths: hotPosts,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const afterPosts = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    { orderings: '[document.first_publication_date]', after: response.id }
  );

  const beforePosts = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    { orderings: '[document.first_publication_date desc]', after: response.id }
  );
  const after = {
    uid: afterPosts.results_size > 0 ? afterPosts.results[0].uid : '',
    title: afterPosts.results_size > 0 ? afterPosts.results[0].data.title : '',
  };
  const before = {
    uid: beforePosts.results_size > 0 ? beforePosts.results[0].uid : '',
    title:
      beforePosts.results_size > 0 ? beforePosts.results[0].data.title : '',
  };

  const post = {
    first_publication_date: response.first_publication_date,
    ...response,
    data: {
      ...response.data,
      title: response.data.title,
      banner: response.data.banner,
      author: response.data.author,
      content: response.data.content,
    },
  };

  return {
    props: {
      post,
      preview,
      before,
      after,
      redirect: 60 * 30, // 30 minutes
    },
  };
};
