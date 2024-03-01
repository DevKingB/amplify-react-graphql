import React, { useState, useEffect, FormEvent } from "react";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import { Amplify } from 'aws-amplify';
import * as Storage from '@aws-amplify/storage'; // Corrected import for all Storage operations
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
import { listTodos } from "./graphql/queries";
import { createTodo as createNoteMutation, deleteTodo as deleteNoteMutation } from "./graphql/mutations";
import { generateClient } from 'aws-amplify/api';
import config from './amplifyconfiguration.json';
Amplify.configure(config);

interface Todo {
  id?: string;
  name: string;
  description: string;
  image?: string;
}

interface AppProps {
  signOut?: () => void;
}

const client = generateClient();

const App: React.FC<AppProps> = ({ signOut }) => {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    fetchTodos();
  }, []);

  async function fetchTodos() {
    const apiData = await client.graphql({ query: listTodos }) as { data: { listTodos: { items: Todo[] } } };
    const todosFromAPI = apiData.data.listTodos.items;
    await Promise.all(todosFromAPI.map(async todo => {
      if (todo.image) {
        const imageKey = todo.image;
        const urlData = await Storage.getUrl({ key: imageKey });
        todo.image = urlData as unknown as string; // Adjusting based on your storage configuration
      }
      return todo;
    }));
    setTodos(todosFromAPI);
  }

  async function createNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const image = form.get("image") as File;
    const data = {
      name: form.get("name")?.toString() || '',
      description: form.get("description")?.toString() || '',
      image: image ? image.name : undefined,
    };
    if (data.image && image) {
      // Preparing the upload input according to the expected Structure.
      const uploadInput = {
        key: data.image,
        data: image,
        contentType: image.type,
      };

      // Used try catch block to ensure data is uploaded to S3 before creating the note.
      try {
        await Storage.uploadData(uploadInput);
      } catch (error) {
        console.error('Error uploading file: ', error);
      }
    }
    await client.graphql({
      query: createNoteMutation,
      variables: { input: data },
    });
    fetchTodos();
    formElement.reset();
  }

  async function deleteNote(todo: Todo) {
    if (!todo.id || !todo.name) return;
    await Storage.remove({ key: todo.name }); // Adjusted for correct parameter
    await client.graphql({
      query: deleteNoteMutation,
      variables: { input: { id: todo.id } },
    });
    setTodos(todos.filter(t => t.id !== todo.id));
  }

  return (
    <View className="App">
      <Heading level={1}>My Todo App</Heading>
      <form onSubmit={createNote} style={{ margin: "3rem 0" }}>
        <Flex direction="row" justifyContent="center">
          <TextField name="name" placeholder="Todo Name" label="Todo Name" labelHidden variation="quiet" required />
          <TextField name="description" placeholder="Todo Description" label="Todo Description" labelHidden variation="quiet" required />
          <View
            name="image"
            as="input"
            type="file"
            style={{ alignSelf: "end" }}
          />
          <Button type="submit" variation="primary">Create Todo</Button>
        </Flex>
      </form>
      <Heading level={2}>Current Todos</Heading>
      <View style={{ margin: "3rem 0" }}>
        {todos.map((todo) => (
          <Flex key={todo.id || todo.name} direction="row" justifyContent="center" alignItems="center">
            <Text as="strong" fontWeight={700}>{todo.name}</Text>
            <Text as="span" style={{ marginLeft: "1rem", marginRight: "1rem" }}>{todo.description}</Text>
            {todo.image && (<Image src={todo.image} alt={`visual aid for ${todo.name}`} style={{ width: '200px' }} />)}
            <Button variation="link" onClick={() => deleteNote(todo)}>Delete todo</Button>
          </Flex>
        ))}
      </View>
      <Button onClick={signOut}>Sign Out</Button>
    </View>
  );
};

export default withAuthenticator(App);
