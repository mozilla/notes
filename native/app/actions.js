import { CREATE_NOTE, PLEASE_LOGIN } from './utils/constants';
import { v4 as uuid4 } from 'uuid';

export function pleaseLogin() {
  return { type: PLEASE_LOGIN };
}

export function createNote(content = '') {
  const id = uuid4();
  // Return id to callback using promises
  const fct = (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      dispatch({ type: CREATE_NOTE, id, content });
      resolve(id);
    });
  };

  return fct;
}
