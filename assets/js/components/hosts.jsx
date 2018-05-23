import React, { Component } from "react";
import Infinite from "react-infinite";
import { Card, Input, Layout, LocaleProvider, Select, Tabs } from "antd";
import enUS from "antd/lib/locale-provider/en_US";
import socket from "../socket";
import PotentialHost from "./potential-host";
import tabSpec from "./host-tab-spec";
import FilterHeader from "./header/index";
import FileSaver from "file-saver";

const { Content } = Layout;
const { Search } = Input;
const { TabPane } = Tabs;
const { Option } = Select;

export default class Hosts extends Component {
  state = {
    channel: null,
    search: "",
    calls: {},
    edits: {},
    state: null,
    calendars: [],
    globalFilterFn: () => true,
    upper: 10,
    hosts: {}
  };

  setSearch = value => this.setState({ search: value });
  setStateFilter = state => this.setState({ state });
  setCalendarFilter = calendars => this.setState({ calendars });

  filteredHosts = fn =>
    Object.keys(this.state.hosts).filter(e => {
      const host = this.state.hosts[e];
      return fn(host) && this.state.globalFilterFn(host);
    });

  countHostsFor = fn => this.filteredHosts(fn).length;

  setGlobalFilterFn = globalFilterFn => this.setState({ globalFilterFn });

  hostsFor = (fn, category) =>
    this.filteredHosts(fn)
      .chunk(2)
      .map(([id1, id2]) => (
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-around"
          }}
        >
          <PotentialHost
            id={id1}
            ph={this.state.hosts[id1]}
            channel={this.state.channel}
            calls={this.state.calls[id1]}
            edits={this.state.edits[id1]}
            category={category}
          />
          {id2 && (
            <PotentialHost
              id={id2}
              ph={this.state.hosts[id2]}
              channel={this.state.channel}
              calls={this.state.calls[id2]}
              edits={this.state.edits[id2]}
              category={category}
            />
          )}
        </div>
      ));

  componentWillMount() {
    window.tagOptions = [];
  }

  componentDidMount() {
    const token = document
      .querySelector("#guardian_token")
      .getAttribute("content");

    this.state.channel = socket.channel("hosts", { guardian_token: token });

    this.state.channel
      .join()
      .receive("ok", resp => {
        console.log("Joined successfully", resp);
      })
      .receive("error", resp => {
        console.log("Unable to join", resp);
      });

    this.state.channel.on("host", ({ id, host }) => {
      this.state.host[id] = host;
      this.forceUpdate();
    });

    this.state.channel.on("hosts", ({ all_hosts }) => {
      all_hosts.forEach(({ id, host }) => {
        this.state.hosts[id] = host;
      });
      this.forceUpdate();
    });

    this.state.channel.on("call-logs", ({ id, calls }) => {
      this.state.calls[id] = calls;
      this.forceUpdate();
    });

    this.state.channel.on("checkout", ({ id, actor }) => {
      this.state.hosts[id].checked_out_by = actor;
      this.forceUpdate();
    });

    this.state.channel.on("checkin", ({ id }) => {
      this.state.hosts[id].checked_out_by = undefined;
      this.forceUpdate();
    });

    this.state.channel.push("ready");
  }

  download = () => {
    const as_csv =
      "Submitted At, Name, Phone Number, Email Address, Zip, Type\n" +
      this.filteredHosts(() => true)
        .map(id => {
          const {
            submitted_at,
            contact: { name, phone_number, email_address, zip },
            type
          } = this.state.hosts[id];
          return [submitted_at, name, phone_number, email_address, zip, type]
            .map(s => `"${s}"`)
            .join(",");
        })
        .join("\n");

    const blob = new Blob([as_csv], { type: "text/csv;charset=utf-8" });
    FileSaver.saveAs(blob, `${Date.now()}-hosts-export.csv`);
  };

  render() {
    return (
      <LocaleProvider locale={enUS}>
        <Layout style={{ width: "100%", height: "100%" }}>
          <FilterHeader
            setGlobalFilterFn={this.setGlobalFilterFn}
            download={this.download}
          />
          <Content>
            <Tabs>
              {tabSpec.map(({ title, fn }) => (
                <TabPane
                  tab={title + ` (${this.countHostsFor(fn)})`}
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
                      style={{ width: "100%" }}
                      className="infinite-container"
                      useWindowAsScrollContainer={true}
                      elementHeight={217 + 25}
                    >
                      {this.hostsFor(fn, title)}
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

Array.prototype.chunk = function(groupsize) {
  var sets = [],
    chunks,
    i = 0;
  chunks = this.length / groupsize;

  while (i < chunks) {
    sets[i] = this.splice(0, groupsize);
    i++;
  }

  return sets;
};
