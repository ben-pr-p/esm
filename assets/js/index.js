import React from "react";
import { render } from "react-dom";
import { Layout, Icon, Button } from "antd";

const { Header, Content } = Layout;

render(
  <Layout>
    <Header>
      <h1 style={{ color: "white" }}>
        Hey friends! Here are you two views below.
      </h1>
    </Header>
    <Content
      style={{
        height: "90vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Button icon="switcher" size="large" href="/esm">
        Event Management
      </Button>
      <div style={{ width: "100px" }} />
      <Button icon="bars" size="large" href="/list">
        All Events
      </Button>
    </Content>
  </Layout>,
  document.getElementById("app")
);
