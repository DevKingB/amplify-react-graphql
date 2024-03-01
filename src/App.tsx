import React, { useState, useEffect, FormEvent } from "react";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import { Amplify, Storage } from 'aws-amplify'; // Ensure Amplify is imported for configuration
import {
  Button,
  Flex,
  Heading,
  Image,
  Text,
  TextField,
  View,
  withAuthenticator,
} from "@aws-amplify/ui-react";
import { listTodos } from "./graphql/queries"; // Corrected import
import { createTodo as createNoteMutation } from "./graphql/mutations"; // Corrected import
import { deleteTodo as deleteNoteMutation } from "./graphql/mutations"; // Corrected import
import { generateClient } from 'aws-amplify/api';
import config from './amplifyconfiguration.json';
Amplify.configure(config);

interface Todo { // Renamed from Note to Todo to match your GraphQL schema
  id?: string;
  name: string;
  description: string;
  image: string;
}

interface AppProps {
  signOut?: () => void;
}

const client = generateClient();

const App: React.FC<AppProps> = ({ signOut }) => {
  const [todos, setTodos] = useState<Todo[]>([]); // Renamed from notes to todos

  useEffect(() => {
    fetchTodos(); // Renamed from fetchNotes to fetchTodos
  }, []);

  async function fetchTodos() { // Renamed from fetchNotes to fetchTodos
    const apiData = await client.graphql({ query: listTodos });
    const todosFromAPI = (apiData as any).data.listTodos.items as Todo[]; // Cast to Todo[]
    await Promise.all(todosFromAPI.map(async todo => {
      if (todo.image) {
        const url = await Storage.get(todo.name);
        todo.image = url;
      }
      return todo;
    }));
    setTodos(todosFromAPI);
  }

  async function createNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget as HTMLFormElement;
    const form = new FormData(formElement);
    const image = form.get("image") as File;
    const data = {
      name: form.get("name")?.toString() || '',
      description: form.get("description")?.toString() || '',
      image: image.name || null,
    };
    if (!!data.image) await Storage.put(data.name, image);
    await client.graphql({
      query: createNoteMutation, // Now correctly refers to createTodo
      variables: { input: data },
    });
    fetchTodos(); // Renamed from fetchNotes to fetchTodos
    // //event.currentTarget.reset();
    formElement.reset(); // Now correctly refers to formElement
  }

  async function deleteNote(note: Todo, name?: string) { // Parameter type adjusted to Todo
    if (!note.id) return; // Ensure we have an id before attempting to delete
    const newTodos = todos.filter(n => n.id !== note.id);
    setTodos(newTodos);
    await Storage.remove(name);
    await client.graphql({
      query: deleteNoteMutation, // Now correctly refers to deleteTodo
      variables: { input: { id: note.id } },
    });
  }

  return (
    <View className="App">
      <Heading level={1}>My Todo App</Heading>
      <form onSubmit={createNote} style={{ margin: "3rem 0" }}>
        <Flex direction="row" justifyContent="center">
          <TextField
            name="name"
            placeholder="Todo Name"
            label="Todo Name"
            labelHidden
            variation="quiet"
            required
          />
          <TextField
            name="description"
            placeholder="Todo Description"
            label="Todo Description"
            labelHidden
            variation="quiet"
            required
          />
          <Button type="submit" variation="primary">
            Create Todo
          </Button>
        </Flex>
      </form>
      <Heading level={2}>Current Todos</Heading>
      <View style={{ margin: "3rem 0" }}>
        {todos.map((todo) => (
          <Flex
            key={todo.id || todo.name}
            direction="row"
            justifyContent="center"
            alignItems="center"
          >
            <Text as="strong" fontWeight={700}>
              {todo.name}
            </Text>
            <Text as="span" style={{ marginLeft: "1rem", marginRight: "1rem" }}>
              {todo.description}
            </Text>
            {todo.image && (<Image src={todo.image} alt={`visual aid for ${todo.name}`} style={{ width: 400}} />)}
            <Button variation="link" onClick={() => deleteNote(todo)}>
              Delete todo
            </Button>
          </Flex>
        ))}
      </View>

      {/* Add image to the todo block here */}
      <View 
        style={{ alignSelf: "end" }}
        name = "image"
        as = "input"
        type="file"
      >
      </View>


      <Button onClick={signOut}>Sign Out</Button>
    </View>
  );
};

export default withAuthenticator(App);
