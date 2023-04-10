import { ChangeEvent } from 'react';
import NestedProvidersExample from '~/examples/nested-providers';
import { createStore } from '~/lib/create-store';

type K = 'x' | 'y' | 'z';
interface CountersState {
  x: number;
  y: number;
  z: number;
  increment: (key: K) => void;
  decrement: (key: K) => void;
  set: (key: K, val: number) => void;
}

const CountersStore = createStore<CountersState>((setState) => ({
  x: 0,
  y: 0,
  z: 0,
  increment(key: K) {
    setState((state) => ({ ...state, [key]: state[key] + 1 }));
  },

  decrement(key: K) {
    setState((state) => ({ ...state, [key]: state[key] - 1 }));
  },

  set(key: K, value: CountersState[K]) {
    setState((state) => ({ ...state, [key]: value }));
  }
}));

function CounterInput({ counterKey }: { counterKey: K }) {
  const { useStore } = CountersStore;
  const value = useStore((state) => state[counterKey]);
  const increment = useStore((state) => state.increment);
  const decrement = useStore((state) => state.decrement);
  const set = useStore((state) => state.set);

  const inputChangeHandler = (e: ChangeEvent<HTMLInputElement>) => {
    set(counterKey, +e.target.value);
  };

  return (
    <div>
      <h3>Value of {counterKey}:</h3>
      <input value={value} onChange={inputChangeHandler} />
      <button onClick={() => increment(counterKey)}>Increment</button>
      <button onClick={() => decrement(counterKey)}>Decrement</button>
    </div>
  );
}

function DisplaySum() {
  const { useStore } = CountersStore;
  const { x, y } = useStore(
    ({ x, y }) => ({ x, y }),
    // equality checker
    (arg1, arg2) => JSON.stringify(arg1) === JSON.stringify(arg2)
  );

  // the type of the selected value is automatically inferred when `options.store` is provided
  return <h3>The product of X & Y is: {x * y}</h3>;
}

function ConsumerThatDoesNotReact() {
  CountersStore.useStore((_state) => null);

  return <p>This component does not re-render despite calling the `useStore` hook</p>;
}

export default function App() {
  return (
    // The `Provider` does not take props besides `children`
    <CountersStore.Provider>
      {/* Only renders when X changes*/}
      <CounterInput counterKey="x" />

      {/* Only renders when Y changes*/}
      <CounterInput counterKey="y" />

      {/* Only renders when Z changes*/}
      <CounterInput counterKey="z" />

      <hr style={{ margin: '20px 0' }} />

      {/* Only renders when X or Y change */}
      <DisplaySum />

      {/* Does not react to changes in the store */}
      <ConsumerThatDoesNotReact />

      <NestedProvidersExample />
    </CountersStore.Provider>
  );
}
