import React, { Component } from "react";
import { Input, Icon, Select, Button, DatePicker } from "antd";
import moment from "moment";

export default class Filter extends Component {
  state = {
    value: undefined,
    option: undefined
  };

  componentWillMount() {
    const type = this.props.filterSpec[this.props.field].type;
    this.state.option = type == "string" ? "contains" : "is on or after";
  }

  render() {
    const render_fn = this.renderFunctions[
      this.props.filterSpec[this.props.field].type
    ];
    return render_fn(this.props, this.state);
  }

  setValue = e => {
    if (moment.isMoment(e)) {
      this.state.value = e;
    } else {
      this.state.value = e.target.value;
    }
    this.props.updateFilter(this.getFilterFn());
  };

  setOption = option => {
    this.state.option = option;
    this.props.updateFilter(this.getFilterFn());
  };

  getFilterFn = () => event => {
    const type = this.props.filterSpec[this.props.field].type;

    if (type == "string") {
      let value = get_in(event, this.props.field);
      value = value
        ? Array.isArray(value)
          ? JSON.stringify(value).toLowerCase()
          : value.toLowerCase()
        : value;

      if (this.state.value == undefined) {
        return true;
      }

      if (this.state.option == "contains") {
        return value && value.includes(this.state.value.toLowerCase());
      } else if (this.state.option == "does not contain") {
        return !value || !value.includes(this.state.value.toLowerCase());
      }

      return false;
    } else if (type == "date") {
      let value = moment(get_in(event, this.props.field));

      if (value.format("YY-MM-DD") == this.state.value.format("YY-MM-DD")) {
        return true;
      }

      if (this.state.option == "is on or before") {
        return value.isBefore(this.state.value);
      } else if (this.state.option == "is on or after") {
        return value.isAfter(this.state.value);
      } else {
        return false;
      }
    } else {
      console.error(`Unknown type: ${type}`);
    }
  };

  renderString = (props, state) => {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 3,
          height: "75%",
          position: "relative"
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "larger",
            textTransform: "uppercase",
            padding: 3
          }}
        >
          {props.filterSpec[props.field].display}
        </span>
        <Input
          addonBefore={
            <Select
              defaultValue="contains"
              style={{ width: 80 }}
              onChange={this.setOption}
            >
              {["contains", "does not contain"].map(v => (
                <Option value={v}>{v}</Option>
              ))}
            </Select>
          }
          onPressEnter={this.setValue}
          style={{ width: 200 }}
        />

        <Button
          onClick={props.deleteMe}
          shape="circle"
          icon="close"
          type="danger"
        />
      </div>
    );
  };

  renderDate = (props, state) => {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 3,
          height: "75%",
          position: "relative"
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "larger",
            textTransform: "uppercase",
            padding: 3
          }}
        >
          {props.filterSpec[props.field].display}
        </span>
        <Select
          defaultValue="is on or after"
          style={{ width: 140 }}
          onChange={this.setOption}
        >
          {["is on", "is on or before", "is on or after"].map(v => (
            <Option value={v}>{v}</Option>
          ))}
        </Select>
        <DatePicker onChange={this.setValue} />
        <Button
          onClick={props.deleteMe}
          shape="circle"
          icon="close"
          type="danger"
        />
      </div>
    );
  };

  renderFunctions = {
    string: this.renderString,
    date: this.renderDate
  };
}

const get_in = (map, key) => {
  if (key == undefined || key == "") {
    return map;
  }

  const split = key.split(".");
  const part_0 = split[0];
  return get_in(map[part_0], split.slice(1).join("."));
};
