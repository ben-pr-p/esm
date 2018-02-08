import React, { Component } from "react";
import Infinite from "react-infinite";
import { Card, Input, Layout, LocaleProvider, Select, Tabs } from "antd";
import enUS from "antd/lib/locale-provider/en_US";
import socket from "../socket";
import EventCard from "./event-card";
import PotentialHost from "./potential-host";
import tabSpec from "./tab-spec";
import FilterHeader from "./header/index";

const { Content } = Layout;
const { Search } = Input;
const { TabPane } = Tabs;
const { Option } = Select;

export default class Esm extends Component {
  state = {
    events: {},
    channel: null,
    search: "",
    calls: {},
    edits: {},
    state: null,
    calendars: [],
    globalFilterFn: () => true,
    upper: 10,
    potential_hosts: []
  };

  setSearch = value => this.setState({ search: value });
  setStateFilter = state => this.setState({ state });
  setCalendarFilter = calendars => this.setState({ calendars });

  filteredEvents = fn =>
    Object.keys(this.state.events).filter(e => {
      const event = this.state.events[e];
      return fn(event) && this.state.globalFilterFn(event);
    });

  countEventsFor = fn => this.filteredEvents(fn).length;

  setGlobalFilterFn = globalFilterFn => this.setState({ globalFilterFn });

  eventsFor = (fn, category) =>
    this.filteredEvents(fn)
      .sort(
        (a, b) =>
          new Date(this.state.events[a].start_date) -
          new Date(this.state.events[b].start_date)
      )
      .map(id => (
        <EventCard
          key={id}
          event={this.state.events[id]}
          id={id}
          calls={this.state.calls[id]}
          edits={this.state.edits[id]}
          channel={this.state.channel}
          category={category}
        />
      ));

  componentWillMount() {
    window.tagOptions = [];
  }

  componentDidMount() {
    const token = document
      .querySelector("#guardian_token")
      .getAttribute("content");

    this.state.channel = socket.channel("events", { guardian_token: token });

    this.state.channel
      .join()
      .receive("ok", resp => {
        console.log("Joined successfully", resp);
      })
      .receive("error", resp => {
        console.log("Unable to join", resp);
      });

    this.state.channel.on("event", ({ id, event }) => {
      this.state.events[id] = event;
      event.tags.forEach(t => window.tagOptions.push(t));
      this.forceUpdate();
    });

    this.state.channel.on("events", ({ all_events }) => {
      all_events.forEach(({ id, event }) => {
        this.state.events[id] = event;
        event.tags.forEach(t => window.tagOptions.push(t));
      });
      this.forceUpdate();
    });

    this.state.channel.on("potential-hosts", ({ potential_hosts }) => {
      this.setState({ potential_hosts });
    });

    this.state.channel.on("call-logs", ({ id, calls }) => {
      this.state.calls[id] = calls;
      this.forceUpdate();
    });

    this.state.channel.on("edit-logs", ({ id, edits }) => {
      this.state.edits[id] = edits;
      this.forceUpdate();
    });

    this.state.channel.on("checkout", ({ id, actor }) => {
      this.state.events[id].checked_out_by = actor;
      this.forceUpdate();
    });

    this.state.channel.on("checkin", ({ id }) => {
      this.state.events[id].checked_out_by = undefined;
      this.forceUpdate();
    });

    this.state.channel.push("ready", { page: "esm" });
  }

  render() {
    return (
      <LocaleProvider locale={enUS}>
        <Layout style={{ width: "100%", height: "100%" }}>
          <FilterHeader setGlobalFilterFn={this.setGlobalFilterFn} />
          <Content>
            <Tabs>
              {[
                <TabPane
                  tab={`Potential Hosts (${this.state.potential_hosts.length})`}
                  key="potential-hosts"
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      paddingLeft: 25,
                      paddingRight: 25
                    }}
                  >
                    <Infinite
                      useWindowAsScrollContainer={true}
                      elementHeight={300}
                    >
                      {this.state.potential_hosts.map(ph => (
                        <PotentialHost
                          id={ph}
                          ph={ph}
                          channel={this.channel}
                          calls={this.state.calls[ph.id]}
                          edits={this.state.edits[ph.id]}
                        />
                      ))}
                    </Infinite>
                  </div>
                </TabPane>
              ].concat(
                tabSpec.map(({ title, fn }) => (
                  <TabPane
                    tab={title + ` (${this.countEventsFor(fn)})`}
                    key={title}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        paddingLeft: 25,
                        paddingRight: 25
                      }}
                    >
                      <Infinite
                        useWindowAsScrollContainer={true}
                        elementHeight={634}
                      >
                        {this.eventsFor(fn, title)}
                      </Infinite>
                    </div>
                  </TabPane>
                ))
              )}
            </Tabs>
          </Content>
        </Layout>
      </LocaleProvider>
    );
  }
}
