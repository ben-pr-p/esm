import React, { Component } from "react";
import enUS from "antd/lib/locale-provider/en_US";
import { Layout, LocaleProvider } from "antd";
import moment from "moment";
import socket from "../socket";
import EventCard from "./event-card";
import { Spin } from "antd";

const { Header, Content } = Layout;

export default class MyEvents extends Component {
  state = {
    events: {},
    typeOptions: [],
    channel: null,
    candidate: null,
    turnouts: {}
  };

  componentWillMount() {
    window.tagOptions = [];
    this.state.candidate = document
      .querySelector("#candidate-tag")
      .getAttribute("data");
  }

  componentDidMount() {
    const token = document
      .querySelector("#candidate-token")
      .getAttribute("content");

    this.state.channel = socket.channel("events", { candidate_token: token });

    this.state.channel
      .join()
      .receive("ok", resp => {
        console.log("Joined successfully", resp);
      })
      .receive("error", resp => {
        console.log("Unable to join", resp);
      });

    this.state.channel.on("event", ({ id, event }) => {
      event.tags.forEach(t => window.tagOptions.push(t));
      this.state.events[id] = event;
      this.state.typeOptions = [
        ...new Set(this.state.typeOptions.concat([event.type]))
      ];

      this.forceUpdate();
    });

    this.state.channel.on("turnout-survey", ({ id, survey }) => {
      this.state.turnouts[`${id}`] = survey;
      this.forceUpdate();
    });

    this.state.channel.push("ready", { page: "candidate-events" });

    setTimeout(() => {
      if (Object.keys(this.state.events).length == 0) {
        this.setState({ no_events: true });
      }
    }, 20000);
  }

  render() {
    const events = Object.keys(this.state.events).filter(id => {
      return this.state.events[id].status != "cancelled";
    });

    const future = events
      .filter(id => {
        return new Date(this.state.events[id].start_date) > new Date();
      })
      .sort(
        (a, b) => (moment(a.start_date).isBefore(moment(b.start_date)) ? 1 : -1)
      );

    const past = events
      .filter(idx => {
        return new Date(this.state.events[idx].start_date) < new Date();
      })
      .sort(
        (a, b) => (moment(a.start_date).isBefore(moment(b.start_date)) ? -1 : 1)
      );

    return (
      <LocaleProvider locale={enUS}>
        <Layout style={{ width: "100%", height: "100%", overflow: "hidden" }}>
          <Header style={{ display: "flex", justifyContent: "space-around" }}>
            <h1 style={{ color: "white" }}>Edit Your Events</h1>
            <h2 style={{ color: "white" }}>
              You can double click on any text field or date to edit it.
            </h2>
          </Header>

          <Content
            style={{
              width: "100%",
              padding: 25,
              minHeight: "100vh",
              position: "relative"
            }}
          >
            {Object.keys(this.state.events).length == 0 &&
              !this.state.no_events && (
                <Spin
                  style={{
                    height: "100%",
                    position: "absolute",
                    top: "50%",
                    left: "50%"
                  }}
                  size="large"
                />
              )}

            {this.state.no_events && (
              <div>
                <h1 style={{ textAlign: "center" }}> No Events </h1>
                <span style={{ fontSize: 18 }}>
                  Does this seem like a mistake? Please contact
                  <a href="mailto:events@justicedemocrats.com">
                    {" "}
                    events@justicedemocrats.com{" "}
                  </a>
                  to resolve any potential issues.
                </span>
              </div>
            )}

            {Object.keys(this.state.events).length > 0 &&
              (future.length > 0 ? (
                <h1 style={{ textAlign: "center" }}> Upcoming </h1>
              ) : (
                <h1 style={{ textAlign: "center" }}> No Upcoming Events </h1>
              ))}

            {future.map(id => (
              <EventCard
                key={id}
                id={id}
                event={this.state.events[id]}
                channel={this.state.channel}
                typeOptions={this.state.typeOptions}
                category={undefined}
                candidate={this.state.candidate}
                survey={this.state.turnouts[id]}
                hostEdit={true}
              />
            ))}

            {past.length > 0 && (
              <h1 style={{ textAlign: "center" }}> Past Events </h1>
            )}
            {past.map(id => (
              <EventCard
                key={id}
                id={id}
                event={this.state.events[id]}
                channel={this.state.channel}
                typeOptions={this.state.typeOptions}
                category={undefined}
                hostEdit={true}
              />
            ))}
          </Content>
        </Layout>
      </LocaleProvider>
    );
  }
}
