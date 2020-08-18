import {BasicInterface} from './basic_interface';

/**
 * Simple class used for testing
 */
export class BasicClass implements BasicInterface {
  value = true;
  returnsString() {
    return '';
  }
  returnsObject() {
    return new BasicClass();
  }
}
