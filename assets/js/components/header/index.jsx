import React, { Component } from "react";
import { Button, Icon, Layout, Select, DatePicker } from "antd";
import Filter from "./filter";
import Sort from "./sort";

const { Header, Content } = Layout;
const { Option } = Select;

export default class FilterHeader extends Component {
  state = {
    adding: false,
    filters: [],
    filterFns: {}
  };

  addFilter = () => this.setState({ adding: true });
  chooseField = field =>
    this.setState({
      filters: this.state.filters.concat([
        {
          field,
          value: undefined,
          options: {},
          rand_id: Math.random()
            .toString()
            .split(".")[1]
        }
      ]),
      adding: false
    });

  wrapDeleteMe = (idx, rand_id) => () => {
    const filters = this.state.filters.slice();
    const removed = filters.splice(idx, 1);
    delete this.state.filterFns[rand_id];
    this.props.setGlobalFilterFn(this.constructGlobalFilter());
    this.setState({
      filters
    });
  };

  wrapUpdateFilter = rand_id => fn => {
    const filterFns = Object.assign({}, this.state.filterFns);
    filterFns[rand_id] = fn;
    this.state.filterFns = filterFns;
    this.props.setGlobalFilterFn(this.constructGlobalFilter());
  };

  constructGlobalFilter = () => ev => {
    const tests = Object.keys(this.state.filterFns).map(key =>
      this.state.filterFns[key](ev)
    );
    const failing = tests.filter(result => !result);
    return failing.length == 0;
  };

  render() {
    const { filters, adding } = this.state;

    return (
      <Header>
        <div
          style={{
            display: "flex",
            paddingTop: 10,
            paddingBottom: 10,
            alignItems: "center",
            height: "100%",
            justifyContent: "space-between"
          }}
        >
          <Sort filterSpec={filterSpec} setSortFn={this.props.setSortFn} />

          <div
            style={{
              display: "flex",
              paddingTop: 10,
              paddingBottom: 10,
              alignItems: "center",
              height: "100%",
              justifyContent: "space-between"
            }}
          >
            {filters.map(({ field, value, options, rand_id }, idx) => (
              <Filter
                field={field}
                value={value}
                rand_id={rand_id}
                options={options}
                filterSpec={filterSpec}
                deleteMe={this.wrapDeleteMe(idx, rand_id)}
                updateFilter={this.wrapUpdateFilter(rand_id)}
              />
            ))}
          </div>

          <div
            style={{
              display: "flex",
              paddingTop: 10,
              paddingBottom: 10,
              alignItems: "center",
              height: "100%",
              justifyContent: "space-between"
            }}
          >
            {adding ? (
              <Select
                placeholder="Filter by..."
                style={{ width: 200 }}
                onChange={this.chooseField}
                autoFocus={true}
              >
                {Object.keys(filterSpec).map(field => (
                  <Option value={field}>{filterSpec[field].display}</Option>
                ))}
              </Select>
            ) : (
              <Button icon="plus" onClick={this.addFilter}>
                Add a Filter
              </Button>
            )}
          </div>

          {this.props.download && (
            <Button icon="save" onClick={this.props.download} />
          )}
        </div>
      </Header>
    );
  }
}

const filterSpec = {
  id: { type: "string", display: "ID" },
  title: { type: "string", display: "Title" },
  start_date: { type: "date", display: "Date" },
  created_date: { type: "date", display: "Submitted At" },
  description: { type: "string", display: "Description" },
  type: { type: "string", display: "Type" },
  "contact.name": { type: "string", display: "Host Name" },
  "contact.email_address": { type: "string", display: "Host Email" },
  "location.venue": { type: "string", display: "Venue Name" },
  "location.locality": { type: "string", display: "City" },
  "location.region": { type: "string", display: "State" },
  "location.postal_code": { type: "string", display: "Zip Code" },
  tags: { type: "string", display: "Tags" }
};
