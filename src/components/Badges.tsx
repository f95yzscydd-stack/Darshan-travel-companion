import { Badge } from './Badge';
import { Currency, Priority, ValidationStatus } from '@/src/types/models';

export const CostBadge = ({ amount, currency }: { amount: number; currency: Currency }) =>
  <Badge tone="sand">{amount ? `≈ ${currency === 'EUR' ? '€' : 'C$'}${amount}` : 'Free'}</Badge>;
export const DietaryWarningBadge = () => <Badge tone="blush">Pork ingredients · check preference</Badge>;
export const ReservationBadge = () => <Badge tone="sky">Reservation</Badge>;
export const ValidationBadge = ({ status }: { status: ValidationStatus }) =>
  <Badge tone={status === 'approved' ? 'mint' : 'sand'}>{status === 'approved' ? 'Trip-approved' : status}</Badge>;
export const PriorityBadge = ({ priority }: { priority: Priority }) =>
  <Badge tone={priority === 'essential' ? 'lime' : priority === 'flexible' ? 'sand' : 'mint'}>{priority}</Badge>;
