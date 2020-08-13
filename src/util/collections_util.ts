/*
    Copyright 2020 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

export class CollectionsUtil {
  /**
   * Adds value to a Map with Set value types.
   * @param {Map<K, Set<V>>} map - Map to add to.
   * @param {K} key - Key to insert value at.
   * @param {V} val - Value to insert.
   */
  static addToMapSet<K, V>(map: Map<K, Set<V>>, key: K, val: V): void {
    let values: Set<V> | undefined = map.get(key);
    if (!values) {
      values = new Set<V>();
      map.set(key, values);
    }
    values.add(val);
  }

  /**
   * Adds multiple values to a Map with Set value types.
   * @param {Map<K, Set<V>>} map - Map to add to.
   * @param {K} key - Key to insert value at.
   * @param {V[]} vals - Values to insert.
   */
  static addMultipleToMapSet<K, V>(
    map: Map<K, Set<V>>,
    key: K,
    vals: V[]
  ): void {
    vals.forEach(val => {
      this.addToMapSet(map, key, val);
    });
  }
}
