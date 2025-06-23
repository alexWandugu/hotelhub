import NewTransactionClient from './new-transaction-client';

export default function NewTransactionPage({ params }: { params: { hotelId: string } }) {
  return <NewTransactionClient hotelId={params.hotelId} />;
}
