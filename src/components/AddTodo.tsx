import React, { useRef } from "react";
import gql from "graphql-tag";
import { useMutation } from "@apollo/react-hooks";

const ADD_TODO = gql`
  mutation MyMutation($name: String!) {
    insert_users_one(object: { name: $name }) {
      id
      name
    }
  }
`;

function AddTodo() {
  const input = useRef<HTMLInputElement>(null);
  const [addTodo, { data }] = useMutation(ADD_TODO);
  console.log(data);

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTodo({ variables: { name: input.current?.value } });
          if (input.current) {
            input.current.value = "";
          }
        }}
      >
        <input ref={input} />
        <button type="submit">Add Todo</button>
      </form>
    </div>
  );
}

export default AddTodo;
