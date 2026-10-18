import Card from '../../components/PromotionCard'

export default function PromotionCard({ promotion = {} }) {
  return <Card preview promotion={{ ...promotion, title: promotion.title || 'Promotion title' }} />
}
