import React, { Component } from "react";
import socket from "../socket";
import { Table, LocaleProvider, Layout } from "antd";
import enUS from "antd/lib/locale-provider/en_US";
import moment from "moment";
import mtz from "moment-timezone";
import FilterHeader from "./header/index";
import FileSaver from "file-saver";
const { Content } = Layout;

export default class List extends Component {
  columns = [
    "title",
    "status",
    "candidate",
    "browser_url",
    "type",
    "rsvp_download_url",
    "organizer_edit_url",
    "venue",
    "address",
    "city",
    "state",
    "zip",
    "host_name",
    "host_email",
    "host_phone",
    "rsvps",
    "start_date",
    "end_date",
    "tags"
  ].map(attr => ({
    title: capitalize(attr),
    key: attr,
    dataIndex: attr,
    width: 200,
    sorter: (a, b) =>
      attr.includes("date")
        ? mtz(a[attr], "dd MM/DD, h:mm a") < mtz(b[attr], "dd MM/DD, h:mm a")
          ? -1
          : 1
        : typeof a[attr] == "string"
          ? a[attr] < b[attr] ? -1 : 1
          : a[attr] - b[attr],
    render: (text, record, index) =>
      text && text.component ? text.component : text
  }));

  state = {
    events: [],
    globalFilterFn: () => true
  };

  download = () => {
    const as_csv = [this.columns.map(({ title }) => title).join(",")]
      .concat(
        this.state.events
          .filter(this.state.globalFilterFn)
          .map(e =>
            this.columns
              .map(({ dataIndex }) => `"${e[dataIndex].value || e[dataIndex]}"`)
              .join(",")
          )
      )
      .join("\n");
    const blob = new Blob([as_csv], { type: "text/csv;charset=utf-8" });
    FileSaver.saveAs(blob, `${Date.now()}-export.csv`);
  };

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

    this.state.channel.on("event", data => {
      this.state.events.push(preprocess(data.event));
      this.forceUpdate();
    });

    this.state.channel.on("events", ({ all_events }) => {
      all_events.forEach(({ id, event }) => {
        this.state.events.push(preprocess(event));
      });
      this.forceUpdate();
    });

    this.state.channel.push("ready", { page: "list" });
  }

  setGlobalFilterFn = globalFilterFn => this.setState({ globalFilterFn });

  render() {
    return (
      <LocaleProvider locale={enUS}>
        <Layout style={{ width: "100%", height: "100%" }}>
          <FilterHeader
            setGlobalFilterFn={this.setGlobalFilterFn}
            download={this.download}
          />
          <Content>
            <Table
              size="middle"
              scroll={{ x: 3500 }}
              pagination={false}
              bordered={true}
              dataSource={this.state.events.filter(this.state.globalFilterFn)}
              columns={this.columns}
            />
          </Content>
        </Layout>
      </LocaleProvider>
    );
  }
}

const capitalize = str =>
  str
    .replace(/_/g, " ")
    .split(" ")
    .map(s => s.slice(0, 1).toUpperCase() + s.slice(1))
    .join(" ");

const preprocess = ({
  name,
  title,
  status,
  browser_url,
  description,
  instructions,
  type,
  rsvp_download_url,
  organizer_edit_url,
  location,
  contact,
  attendance_count,
  start_date,
  end_date,
  tags,
  time_zone,
  id
}) => {
  return {
    key: id,
    title,
    status,
    description,
    instructions,
    type,
    rsvp_download_url: linkify(rsvp_download_url),
    organizer_edit_url: linkify(organizer_edit_url),
    browser_url: linkify(browser_url),
    address: location.address_lines[0],
    venue: location.venue,
    host_name: contact.name,
    host_email: contact.email_address,
    host_phone: contact.phone_number,
    rsvps: attendance_count,
    city: location.locality,
    state: location.region,
    zip: location.postal_code,
    start_date: mtz(start_date)
      .tz(time_zone || location.time_zone || "America/New_York")
      .format("dd, MM/DD, h:mm a"),
    end_date: mtz(end_date)
      .tz(time_zone || location.time_zone || "America/New_York")
      .format("dd MM/DD, h:mm a"),
    candidate:
      tags
        .filter(
          t =>
            t.startsWith("Calendar: ") &&
            !t.includes("Brand New Congress") &&
            !t.includes("Justice Democrats")
        )
        .map(t => t.split(":")[1].trim())[0] || "General",
    tags: tags.filter(t => !t.startsWith("Calendar: ")).join(", ")
  };
};

const linkify = href => ({
  component: (
    <a target="_blank" href={href}>
      {href}
    </a>
  ),
  value: href
});
