import ImmerChangeset from 'ember-immer-changeset';

export interface DraftLogin {
  email: string;
  password: string;
}

export class LoginChangeset extends ImmerChangeset<DraftLogin> {}
