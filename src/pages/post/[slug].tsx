/* eslint-disable react/no-danger */
import { GetStaticPaths, GetStaticProps } from 'next';
import { format } from 'date-fns';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import ptBR from 'date-fns/locale/pt-BR';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '../../components/Header';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
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
}

export default function Post({ post, preview }: PostProps): JSX.Element {
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
                <div>
                  <h1>Como utilizar Hooks</h1>
                  <Link href="/">
                    <a>Post anterior</a>
                  </Link>
                </div>
                <div>
                  <h1>Criando um app CRA do Zero</h1>
                  <Link href="/">
                    <a>Próximo post</a>
                  </Link>
                </div>
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
      redirect: 60 * 30, // 30 minutes
    },
  };
};
