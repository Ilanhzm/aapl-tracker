import { getSession } from 'next-auth/react';
import Layout from '../components/Layout';

export async function getServerSideProps(ctx) {
  const session = await getSession({ req: ctx.req });
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  return { props: {} };
}

export default function History() {
  return (
    <Layout>
      <div style={{ padding: '32px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '32px', color: '#333' }}>Coming soon</div>
        <div style={{ fontSize: '13px', color: '#444' }}>Did You Miss Those Trades? — in progress</div>
      </div>
    </Layout>
  );
}
