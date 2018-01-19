import React, { Component } from 'react'
import { Button, Icon, Layout, Select, DatePicker } from 'antd'
import Filter from './filter'

const { Header, Content } = Layout
const { Option } = Select

export default class FilterHeader extends Component {
  state = {
    adding: false,
    filters: [],
    filterFns: {}
  }

  addFilter = () => this.setState({ adding: true })
  chooseField = field =>
    this.setState({
      filters: this.state.filters.concat([
        { field, value: undefined, options: {} }
      ]),
      adding: false
    })

  wrapDeleteMe = (idx, field) => () => {
    const filters = this.state.filters.slice()
    const removed = filters.splice(idx, 1)
    delete this.state.filterFns[field]
    this.props.setGlobalFilterFn(this.constructGlobalFilter())
    this.setState({
      filters
    })
  }

  wrapUpdateFilter = field => fn => {
    const filterFns = Object.assign({}, this.state.filterFns)
    filterFns[field] = fn
    this.state.filterFns = filterFns
    this.props.setGlobalFilterFn(this.constructGlobalFilter())
  }

  constructGlobalFilter = () => ev => {
    const tests = Object.keys(this.state.filterFns).map(key =>
      this.state.filterFns[key](ev)
    )
    const failing = tests.filter(result => !result)
    return failing.length == 0
  }

  render() {
    const { filters, adding } = this.state

    return (
      <Header>
        <div
          style={{
            display: 'flex',
            paddingTop: 10,
            paddingBottom: 10,
            alignItems: 'center',
            height: '100%',
            justifyContent: 'space-between'
          }}>
          <div
            style={{
              display: 'flex',
              paddingTop: 10,
              paddingBottom: 10,
              alignItems: 'center',
              height: '100%',
              justifyContent: 'space-between'
            }}>
            {filters.map(({ field, value, options }, idx) => (
              <Filter
                field={field}
                value={value}
                options={options}
                filterSpec={filterSpec}
                deleteMe={this.wrapDeleteMe(idx, field)}
                updateFilter={this.wrapUpdateFilter(field)}
              />
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              paddingTop: 10,
              paddingBottom: 10,
              alignItems: 'center',
              height: '100%',
              justifyContent: 'space-between'
            }}>
            {adding ? (
              <Select
                placeholder="Filter by..."
                style={{ width: 200 }}
                onChange={this.chooseField}>
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
    )
  }
}

const filterSpec = {
  title: { type: 'string', display: 'Title' },
  start_date: {type: 'date', display: 'Date'},
  description: { type: 'string', display: 'Description' },
  type: { type: 'string', display: 'Type' },
  'contact.name': { type: 'string', display: 'Host Name' },
  'contact.email_address': { type: 'string', display: 'Host Email' },
  'location.venue': { type: 'string', display: 'Venue Name' },
  'location.locality': { type: 'string', display: 'City' },
  'location.region': { type: 'string', display: 'State' },
  'location.postal_code': { type: 'string', display: 'Zip Code' },
  tags: { type: 'string', display: 'Tags' }
}
