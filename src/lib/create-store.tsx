import {
  createContext,
  ReactNode,
  useRef,
  useCallback,
  useContext,
  useState,
  useEffect
} from 'react';

// A utility type to return the partial of a type without allowing extra properties
type Exactly<T, P> = T & Record<Exclude<keyof P, keyof T>, never>;

type StoreContextValue<T> = {
  getState: () => T;
  subscribe: (callback: () => void) => () => void;
};

type StateBuilder<T> = (setState: StateSetter<T>) => T;
type StateSetter<T> = (arg: StateSetterArg<T>) => void;
type StateSetterArg<T> = ((state: T) => Exactly<Partial<T>, T>) | Exactly<Partial<T>, T>;

type Selector<T, R> = (state: T) => R;
type Predicate<T> = (arg1: T, arg2: T) => boolean;

type ProviderProps<T> = {
  children: ReactNode;
  value?: StateBuilder<T>;
};

export type Store<T> = {
  Provider: (props: ProviderProps<T>) => JSX.Element;
  useStore: <R>(selector?: (state: T) => R, predicate?: (arg1: R, arg2: R) => boolean) => R;
};

/**
 * Creates a Store object for managing state in a React application.
 *
 * The returned `Store` exposes a `Provider` component — a wrapper for `Context.Provider`, and
 * consuming hooks setup to efficiently trigger the consumer components' re-rendering where needed only.
 *
 * @param stateBuilder - The callback used to setup the store
 * @returns A `Store` object
 */
export function createStore<T>(stateBuilder: StateBuilder<T>): Store<T> {
  const Context = createContext<StoreContextValue<T> | undefined>(undefined);
  const subscribers = new Set<() => void>([]);

  function Provider(props: ProviderProps<T>) {
    // Returns the current version of the state
    const getState = useCallback(() => stateRef.current, []);

    // Used by `useSelector` to pass a callback that triggers a state change in the hook
    const subscribe = useCallback((callback: () => void) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    }, []);

    // The callback used by `actions` to trigger a state change
    const setState: StateSetter<T> = useCallback((input) => {
      switch (typeof input) {
        case 'function':
          stateRef.current = structuredClone({ ...stateRef.current, ...input(stateRef.current) });
          break;
        case 'object':
          stateRef.current = structuredClone({ ...stateRef.current, ...input });
          break;
        default:
          stateRef.current = structuredClone(input);
      }
      subscribers.forEach((callback) => callback());
    }, []);

    // Initialize the context value passed to the provider
    const stateRef = useRef((props.value ?? stateBuilder)(setState));
    // const actionsRef = useRef((props.actions ?? actions)?.(setState) ?? ({} as Actions));
    const contextValue: StoreContextValue<T> = {
      getState,
      subscribe
    };

    return <Context.Provider value={contextValue}>{props.children}</Context.Provider>;
  }

  /**
   * Hook to return any value from the store's `state` object. The output can be any data of any type.
   *
   * @param selector  - A callback to return data from the store
   * @param predicate - An equality checker callback to provider custom comparison logic when "===" is not enough
   * @returns data from the `state` of the closest parent provider
   */
  function useStore<R>(selector?: Selector<T, R>, predicate?: Predicate<R>) {
    // Rentires the entire state object if `selector` is undefined
    const selectorFn: Selector<T, R> = useCallback(
      (state) => (selector ? selector(state) : (state as unknown as R)),
      [selector]
    );

    // Defaults to "===" if `predicate` is undefined.
    const equalityChecker: Predicate<R> = useCallback(
      (arg1, arg2) => (predicate ? predicate(arg1, arg2) : arg1 === arg2),
      [predicate]
    );

    const contextValue = useContext(Context);
    if (!contextValue) {
      throw new Error('useStore must be used within a Store.Provider');
    }

    const { getState, subscribe } = contextValue;
    const [selectedState, setSelectedState] = useState(selectorFn(getState()));

    useEffect(() => {
      return subscribe(() => {
        const newValue = selectorFn(getState());
        if (!equalityChecker(newValue, selectedState)) {
          setSelectedState(newValue);
        }
      });
    }, [equalityChecker, getState, selectedState, selectorFn, subscribe]);

    return selectedState;
  }

  return { Provider, useStore };
}
