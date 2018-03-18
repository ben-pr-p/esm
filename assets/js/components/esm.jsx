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
    tabActiveKey: tabSpec[0].title,
    typeOptions: [],
    globalFilterFn: () => true,
    sortFn: (a, b) => a.created_date - b.created_date
  };

  setSearch = value => this.setState({ search: value });
  setStateFilter = state => this.setState({ state });
  setCalendarFilter = calendars => this.setState({ calendars });
  onTabChange = newActiveKey => {
    return newActiveKey != "Interest Form"
      ? this.setState({ tabActiveKey: newActiveKey })
      : window.open(
          "https://docs.google.com/spreadsheets/d/1zi3D0MWlGuWerm0yiA6vuB389fXOGWfZZoEsx-0SdL8/edit?ts=5a3faeb3#gid=1609788758"
        );
  };

  filteredEvents = fn =>
    Object.keys(this.state.events).filter(e => {
      const event = this.state.events[e];
      return fn(event) && this.state.globalFilterFn(event);
    });

  countEventsFor = fn => this.filteredEvents(fn).length;

  setGlobalFilterFn = globalFilterFn => this.setState({ globalFilterFn });
  setSortFn = sortFn => this.setState({ sortFn });

  eventsFor = (fn, category) =>
    this.filteredEvents(fn)
      .sort((aid, bid) =>
        this.state.sortFn(this.state.events[aid], this.state.events[bid])
      )
      .map(id => (
        <EventCard
          typeOptions={this.state.typeOptions}
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
      const newEvents = Object.assign({}, this.state.events, { [id]: event });
      event.tags.forEach(t => window.tagOptions.push(t));
      this.state.events[id] = event;
      const typeOptions = [
        ...new Set(this.state.typeOptions.concat([event.type]))
      ];
      this.state.typeOptions = typeOptions;
      this.forceUpdate();
    });

    this.state.channel.on("events", ({ all_events }) => {
      const typeOptions = new Set();
      all_events.forEach(({ id, event }) => {
        this.state.events[id] = event;
        event.tags.forEach(t => window.tagOptions.push(t));
        typeOptions.add(event.type);
      });
      this.state.typeOptions = [...typeOptions];
      this.forceUpdate();
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
          <FilterHeader
            setGlobalFilterFn={this.setGlobalFilterFn}
            setSortFn={this.setSortFn}
          />
          <Content>
            <Tabs
              onTabClick={this.onTabChange}
              defaultActiveKey="Needs Approval"
            >
              {tabSpec.map(({ title, fn }) => (
                <TabPane
                  tab={
                    title == "Interest Form"
                      ? title
                      : title + ` (${this.countEventsFor(fn)})`
                  }
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
                      elementHeight={680}
                    >
                      {this.eventsFor(fn, title)}
                    </Infinite>
                  </div>
                </TabPane>
              ))}
            </Tabs>
          </Content>
        </Layout>
      </LocaleProvider>
    );
  }
}
